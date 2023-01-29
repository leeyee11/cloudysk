import fs from "fs-extra";
import path from "path";
import type { FileStats } from "../typings";
import type formiable from "formidable";

const p = path;

const BASE_PATH = p.resolve(process.cwd(),'data');

const hasAccess = (target: string) => {
  const relatives = p.relative(BASE_PATH, target).split(p.sep);
  return relatives.shift() !== "..";
}

const toAbsPath = (path: string) => {
  return path && p.resolve(BASE_PATH, `./${path}`);
}

export const read = async (path: string) => {
  const absPath = path ? toAbsPath(path) : BASE_PATH;
  const pathExists = await fs.pathExists(absPath);
  const access = absPath && pathExists && hasAccess(absPath);
  if (!access) {
    throw new Error("No permission");
  }
  return fs.createReadStream(absPath);
}

export const dir = async (path: string) => {
  const absPath = path ? toAbsPath(path) : BASE_PATH;
  const pathExists = await fs.pathExists(absPath);
  const access = absPath && pathExists && hasAccess(absPath);
  if (!access) {
    throw new Error("No permission");
  }
  const dirList: string[] = await fs.readdir(absPath);
  const dirListStatsInfo: FileStats[] = await Promise.all(
    dirList.map(async (dir: string) => {
      const stat = await fs.stat(p.resolve(absPath, dir));
      return { 
        ...stat, 
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        name: dir
      }
    })
  );
  return dirListStatsInfo;
}

export const stat = async (path: string) => {
  const absPath = path ? toAbsPath(path) : BASE_PATH;
  const pathExists = await fs.pathExists(absPath);
  const access = absPath && pathExists && hasAccess(absPath);
  if (!access) {
    throw new Error("No permission");
  }
  const stat = await fs.stat(absPath);
  return { 
    ...stat, 
    isFile: stat.isFile(),
    isDirectory: stat.isDirectory(),
    name: p.basename(absPath)
  }
}

export const touch = async (path: string) => {
  const absPath = toAbsPath(path);
  const parent = absPath && p.parse(absPath).dir;
  const access = parent && hasAccess(parent);
  if (!access) {
    throw new Error(`No permission on location: ${absPath}`);
  }
  const pathExists = await fs.pathExists(absPath);
  if (pathExists) {
    throw new Error("File already exists");
  }
  await fs.createFile(absPath)
  const fileStatsInfo = await fs.stat(absPath);
  return fileStatsInfo;
}

export const mkdir = async (path: string) => {
  const absPath = toAbsPath(path);
  const parent = absPath && p.parse(absPath).dir;
  const access = parent && hasAccess(parent);
  if (!access) {
    throw new Error(`No permission on location: ${parent}.`);
  }
  await fs.mkdir(absPath)
  const dirStatsInfo = await fs.stat(absPath);
  return dirStatsInfo;
}

export const cp = async (source: string, target: string) => {
  const absSourcePath = source && toAbsPath(source);
  let absTargetPath = target && toAbsPath(target);
  const pathExists = !!absSourcePath && !!absTargetPath && await Promise.all([
    fs.pathExists(absSourcePath), 
    fs.pathExists(absTargetPath)
  ]).then(existsList => existsList.every(exists => !!exists));
  const access = pathExists && hasAccess(absSourcePath) && hasAccess(absTargetPath);
  if (!access) {
    throw new Error(`No permission on location ${absSourcePath} or ${absTargetPath}.`);
  }
  const targetStats = await fs.stat(absTargetPath);
  if (!targetStats.isDirectory()) {
    throw new Error("Target path should be a directory");
  }
  const sourceStats = await fs.stat(absSourcePath);
  if (sourceStats.isDirectory()) {
    await fs.cp(absSourcePath, absTargetPath, { recursive: true }, (err) => console.error(err))
  } else {
    const fileName = p.basename(absSourcePath);
    absTargetPath = p.resolve(absTargetPath, fileName);
    const targetExists = await fs.pathExists(absTargetPath);
    if (targetExists) {
      throw new Error(`Target file already exists`);
    }
    await fs.copyFile(absSourcePath, absTargetPath, (err) => console.error(err));
  }
}

export const mv = async (source: string, target: string, rename = false) => {
  const absSourcePath = source && toAbsPath(source);
  let absTargetPath = target && toAbsPath(target);
  const pathExists = !!absSourcePath && !!absTargetPath && await Promise.all([
    fs.pathExists(absSourcePath), 
    rename || fs.pathExists(absTargetPath)
  ]).then(existsList => existsList.every(exists => !!exists));
  const access = pathExists && hasAccess(absSourcePath) && (rename || hasAccess(absTargetPath));
  if (!access) {
    throw new Error(`No permission on location: ${absSourcePath} or ${absTargetPath}.`);
  }
  const renameTargetExists = rename && await fs.pathExists(absTargetPath);
  if (renameTargetExists) {
    throw new Error(`Target file already exists`);
  }
  const sourceStats = await fs.stat(absSourcePath);
  if (!sourceStats.isDirectory()) {
    if (!rename && (await fs.stat(absTargetPath)).isDirectory()) {
      const fileName = p.basename(absSourcePath);
      absTargetPath = p.resolve(absTargetPath, fileName);
    }
    await fs.move(absSourcePath, absTargetPath, { overwrite: true });
  } else if (sourceStats.isDirectory()) {
    if (!rename && (await fs.stat(absTargetPath)).isDirectory()) {
      const folderName = p.basename(absSourcePath);
      absTargetPath = p.resolve(absTargetPath, folderName);
    }
    await fs.ensureDir(absTargetPath);
    await fs.move(absSourcePath, absTargetPath, { overwrite: true });
  } else {
    throw new Error("Only support move file to file, folder to folder.");
  }
}

export const write = async (path: string, data: any) => {
  const absPath = path && toAbsPath(path);
  const pathExists = absPath && await fs.pathExists(absPath);
  const access = absPath && pathExists && hasAccess(absPath);
  if (!access) {
    throw new Error(`No permission on location: ${absPath}`);
  }
  return fs.writeFile(absPath, data);
}

export const scp = async (path: string, file: formiable.File) => {
  const absPath = path && toAbsPath(path);
  const pathExists = absPath && await fs.pathExists(absPath);
  const access = absPath && pathExists && hasAccess(absPath);
  if (!access) {
    throw new Error(`No permission on location: ${absPath}`);
  }
  const reader = fs.createReadStream(file.filepath);
  const stream = fs.createWriteStream(p.resolve(absPath, file.originalFilename as string));
  reader.pipe(stream);
} 

export const rm = async (path: string) => {
  const absPath = path && toAbsPath(path);
  const pathExists = absPath && await fs.pathExists(absPath);
  const access = absPath && pathExists && hasAccess(absPath);
  if (!access) {
    throw new Error(`No permission on location: ${absPath}`);
  }
  await fs.remove(absPath);
}