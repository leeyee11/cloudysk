import Koa from 'koa';
import Router from 'koa-router';
import { koaBody, } from 'koa-body';
import HttpStatus from 'http-status';
import { cp, mv, dir, touch, mkdir, read, rm, scp, stat, write } from './services/FileService';
import { create, update, query, remove, getCollection, getMarkers, connect, removePath, renamePath, getCategories } from './services/BookmarkService';
import httpStatus from 'http-status';
import path from 'path';
import type formiable from 'formidable';

const p = path;

const app = new Koa();
// const client = new Koa();
const router = new Router();
// serve frontend
// client.use(serve(__dirname + './frontend/build'))

// serve backend
app.use(koaBody({ 
  multipart: true,
  formidable: {
    maxFileSize: 10 * 1024 * 1024 * 1024
  }
}));
// app.use(mount('/', client));

const DEFAULT_USER = "default";

router.get('/api/v1/file', async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    const fileName = p.basename(path);
    const file = await read(path);
    ctx.response.headers['Content-Type'] = 'application/force-download';
    ctx.response.headers['Content-disposition'] = 'attachment; filename=' + fileName;
    ctx.body = file;
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.status = HttpStatus.OK;
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
  }
  await next();
})

router.get('/api/v1/folder', async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    const children = await dir(path).then(children => 
      children.map(stat => ({...stat, parent: path}))
    );
    const fileStat = await stat(path);
    ctx.body = { success: true, data: { ...fileStat, children } }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.status = HttpStatus.OK;
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
  }
  await next();
})

router.get('/api/v1/collection', async (ctx, next) => {
  const name = ctx.request.query.name as string
  try {
    const collection = await getCollection({ collection: name, user: DEFAULT_USER });
    const children = await Promise.all(
      collection.map(async ({ path }) => {
        try {
          const stats = await stat(path);
          return ({...stats, parent: p.dirname(path) })
        } catch (err) {
          await removePath({ path, user: DEFAULT_USER });
          return null;
        }
      })
    ).then(records => records.filter(v => !!v));
    ctx.body = { success: true, data: { children } }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.status = HttpStatus.OK;
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
  }
  await next();
})

router.put('/api/v1/plain', async (ctx, next) => {
  const path = ctx.request.query.path as string;
  const body = ctx.request.body as string;
  try {
    let fileStat;
    if (!body) {
      fileStat = await touch(path);
    } else {  
      await write(path, body);
      fileStat = await stat(path);
    }
    ctx.body = {success: true, data: fileStat }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
    ctx.status = HttpStatus.OK;
  }
  await next();
})

router.put('/api/v1/folder', async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    const dirStat = await mkdir(path);
    ctx.body = {success: true, data: dirStat }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
    ctx.status = HttpStatus.OK;
  }
  await next();
})

router.put('/api/v1/files', async (ctx, next) => {
  const path = ctx.request.query.path as string;
  const file = ctx.request.files?.file;
  if (!file) {
    ctx.body = { success: false, errorMessage: 'No file found' }
    ctx.status = httpStatus.OK;
    return next();
  }
  try {
    const files = Array<formiable.File>().concat(file);
    const results = await Promise.allSettled(files.map((file) => scp(path, file)));
    if (results.every(result => result.status === 'fulfilled')) {
      ctx.body = { success: true }
      ctx.status = HttpStatus.OK;
    } else {
      ctx.body = { success: false, errorMessage: 'Failed to upload some files' }
      ctx.status = httpStatus.OK;
    }
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.post('/api/v1/copy', async (ctx, next) => {
  const source = ctx.request.query.source as string;
  const target = ctx.request.query.target as string;
  try {
    await cp(source, target);
    ctx.body = { success: true }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
});

router.post('/api/v1/move', async (ctx, next) => {
  const source = ctx.request.query.source as string;
  const target = ctx.request.query.target as string;
  const rename = ctx.request.query.rename === 'true';
  try {
    await mv(source, target, rename);
    if (rename) {
      await renamePath({ source, target, user: DEFAULT_USER });
    }
    ctx.body = { success: true }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
});

router.delete('/api/v1/path', async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    await rm(path);
    await removePath({ path, user: DEFAULT_USER });
    ctx.body = { success: true }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
});

router.put('/api/v1/bookmark', async (ctx, next) => {
  try {
    const payload = { ...ctx.request.body, user: DEFAULT_USER };
    const result = await create(payload);
    ctx.body = { success: true, data: result }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.get('/api/v1/pathmarkers', async (ctx, next) => {
  try {
    const user = DEFAULT_USER;
    const path = ctx.request.query.path as string;
    const result = await getMarkers({ user, path });
    ctx.body = { success: true, data: result }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.get('/api/v1/bookmarks', async (ctx, next) => {
  try {
    const user = DEFAULT_USER;
    const collection = ctx.request.query.collection as string;
    const category = ctx.request.query.category as string;
    const criteria = [
      `user = '${user}'`, 
      collection && `collection = '${collection}'`, 
      category && `category = '${category}'`
    ].filter(exp => !!exp).join(' AND ');
    const result = await query(criteria);
    ctx.body = { success: true, data: result }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.post('/api/v1/bookmark', async (ctx, next) => {
  try {
    const collection = ctx.request.body.collection as 'star' | 'audio' | 'video';
    const path = ctx.request.body.path as string;
    const categories = ctx.request.body.categories as string[];
    const type = ctx.request.body.type as 'file';
    const result = await update({ type, collection, path, categories, user: DEFAULT_USER });
    ctx.body = { success: true, data: result }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.delete('/api/v1/bookmark', async (ctx, next) => {
  try {
    const path = ctx.request.query.path as string;
    const collection = ctx.request.query.collection as string;
    const category = ctx.request.query.category as string;
    const user = DEFAULT_USER;
    await remove({ path, collection, category, user });
    ctx.body = { success: true}
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.get('/api/v1/categories', async (ctx, next) => {
  try {
    const collection = await getCategories({ user: DEFAULT_USER });
    ctx.body = { success: true, data: collection }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.status = HttpStatus.OK;
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
  }
  await next();
})

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);

process.on('beforeExit', () => connect(null).then(realm => realm.close()))
