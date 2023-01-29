import Koa from "koa";
import Router from "koa-router";
import { koaBody, } from "koa-body";
import HttpStatus from "http-status";
import { cp, mv, dir, touch, mkdir, read, rm, scp } from "./services/FileService";
import httpStatus from "http-status";
import path from 'path';
import type formiable from "formidable";

const p = path;

const app = new Koa();
// const client = new Koa();
const router = new Router();
// serve frontend
// client.use(serve(__dirname + "./frontend/build"))

// serve backend
app.use(koaBody({ 
  multipart: true,
  formidable: {
    maxFileSize: 10 * 1024 * 1024 * 1024
  }
}));
// app.use(mount("/", client));

router.get("/api/v1/file", async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    const fileName = p.basename(path);
    const file = await read(path);
    ctx.response.headers["Content-Type"] = "application/force-download";
    ctx.response.headers['Content-disposition'] = 'attachment; filename=' + fileName;
    ctx.body = file;
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.status = HttpStatus.OK;
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
  }
  await next();
})

router.get("/api/v1/fileList", async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    const fileList = await dir(path);
    ctx.body = {success: true, data: fileList }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.status = HttpStatus.OK;
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
  }
  await next();
})

router.put("/api/v1/plain", async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    const fileStat = await touch(path);
    ctx.body = {success: true, data: fileStat }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message, data: []}
    ctx.status = HttpStatus.OK;
  }
  await next();
})

router.put("/api/v1/folder", async (ctx, next) => {
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

router.put("/api/v1/files", async (ctx, next) => {
  const path = ctx.request.query.path as string;
  const file = ctx.request.files?.file;
  if (!file) {
    ctx.body = { success: false, errorMessage: "No file found" }
    ctx.status = httpStatus.OK;
    return next();
  }
  try {
    const files = Array<formiable.File>().concat(file);
    const results = await Promise.allSettled(files.map((file) => scp(path, file)));
    if (results.every(result => result.status === "fulfilled")) {
      ctx.body = { success: true }
      ctx.status = HttpStatus.OK;
    } else {
      ctx.body = { success: false, errorMessage: "Failed to upload some files" }
      ctx.status = httpStatus.OK;
    }
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

router.post("/api/v1/copy", async (ctx, next) => {
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

router.post("/api/v1/move", async (ctx, next) => {
  const source = ctx.request.query.source as string;
  const target = ctx.request.query.target as string;
  const rename = ctx.request.query.rename === "true";
  try {
    await mv(source, target, rename);
    ctx.body = { success: true }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
});

router.delete("/api/v1/path", async (ctx, next) => {
  const path = ctx.request.query.path as string;
  try {
    await rm(path);
    ctx.body = { success: true }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.OK;
  }
})

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
