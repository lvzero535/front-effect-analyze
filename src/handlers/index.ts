import path from "path";
import { analyzeTsFile } from "./handleTs.js";
import type { FileAnalyzeResult } from "./types.js";
import { isFileExist } from "../files.js";
import { ProjectProgram } from "../ProjectProgram.js";
import ts from "typescript";
import { getVueSourceFile } from "./handleVue.js";



export async function asyncAnalyzeFile(
  filePath: string,
  projectRoot: string,
): Promise<FileAnalyzeResult> {

  if (!isFileExist(filePath)) {
    return {
      path: filePath,
      fileType: 'ts',
      moduleSpecifiers: [],
      declareVars: [],
      parentModules: [],
      notExist: true,
    };
  }

  const program = await ProjectProgram.getInstance(projectRoot);
  let result: FileAnalyzeResult | undefined;
  const ext = path.extname(filePath);

  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx": {
      const analyzeOptions = program.getAnalyzeOptions(filePath);
      result = await analyzeTsFile(analyzeOptions);
      break;
    }
    case ".vue": {
      const sourceFile = await getVueSourceFile(filePath);
      if (!sourceFile) {
        break;
      }
      const analyzeOptions = program.getAnalyzeOptions(
          filePath,
          () => sourceFile,
          (filePath, compilerOptions) => {
            const program = ts.createProgram({
              rootNames: [filePath],
              options: compilerOptions,
            });
            const checker = program.getTypeChecker();
            return checker;
          }
        );
      result = await analyzeTsFile(analyzeOptions);
      break;
    }
    default:
      result = undefined;
      break;
  }

  if (!result) {
    result = {
      path: filePath,
      moduleSpecifiers: [],
      declareVars: [],
      parentModules: [],
    };
  }
  result.fileType = ext.slice(1) as FileAnalyzeResult['fileType'];
  return result;
}