import path from "path";
import { analyzeTsFile } from "./handleTs.js";
import { handleVue } from "./handleVue.js";
import type { FileAnalyzeResult } from "./types.js";
import { isFileExist } from "../files.js";
import type { ICompilerOptions } from "../types.js";

export async function asyncAnalyzeFile(
  filePath: string,
  compilerOptions: ICompilerOptions,
  dependencies: string[]
): Promise<FileAnalyzeResult> {

  if (!isFileExist(filePath)) {
    return{
      path: filePath,
      fileType: 'ts',
      moduleSpecifiers: [],
      declareVars: [],
      parentModules: [],
      notExist: true,
    };
  } 

  let result: FileAnalyzeResult | undefined;
  const ext = path.extname(filePath);

  switch (ext) {
    case ".ts":
    case ".tsx":
      result = await analyzeTsFile(filePath , compilerOptions, dependencies);
      break;
    case ".js":
    case ".jsx":
      result = await analyzeTsFile(filePath, compilerOptions, dependencies);
      break;
    case ".vue":
      result = await handleVue(filePath, compilerOptions, dependencies);
      break;
    default:
      result = undefined;
      break;
  }

  if (!result) {
    result = {
      path: filePath,
      fileType: ext.slice(1) as FileAnalyzeResult['fileType'],
      moduleSpecifiers: [],
      declareVars: [],
      parentModules: [],
    };
  }
  return result;
}