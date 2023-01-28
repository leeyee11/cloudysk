import Koa from "koa";
import Router from "koa-router";
import mount from "koa-mount";
import logger from "koa-logger";
import { koaBody, } from "koa-body";
import serve from "koa-static";
import HttpStatus from "http-status";
import { cp, mv, dir, touch, mkdir, rm, scp } from "./services/FileService";
import httpStatus from "http-status";
import type formiable from "formidable";

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
      ctx.status = httpStatus.EXPECTATION_FAILED;
    }
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.EXPECTATION_FAILED;
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
    ctx.status = httpStatus.EXPECTATION_FAILED;
  }
});

router.post("/api/v1/move", async (ctx, next) => {
  const source = ctx.request.query.source as string;
  const target = ctx.request.query.target as string;
  try {
    await mv(source, target);
    ctx.body = { success: true }
    ctx.status = HttpStatus.OK;
  } catch (e) {
    ctx.body = { success: false, errorMessage: (e as Error).message }
    ctx.status = httpStatus.EXPECTATION_FAILED;
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
    ctx.status = httpStatus.EXPECTATION_FAILED;
  }
})

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000);
