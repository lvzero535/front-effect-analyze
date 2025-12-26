import type { FileAnalyzeResult } from "./handlers/types.js";
import { asyncAnalyzeFile } from "./handlers/index.js";
import { workerAnalyzeFile } from "./worker/main.js";
import type { IAnalyzeOptions, ICompilerOptions, Result } from "./types.js";

/**
 * 分析项目根目录下的所有文件
 */



async function syncAnalyzeFile(allFiles: string[], compilerOptions: ICompilerOptions, dependencies: string[]) {
  const results: Result = new Map();

  function saveResults(filePath: string, result: FileAnalyzeResult) {
    results.set(filePath, result);
    console.log('已分析文件/总文件', results.size, allFiles.length);
    if (results.size === allFiles.length) {
      console.log('分析完成');
    }
  }

  await Promise.all(allFiles.map(async (filePath) => {
    const result = await asyncAnalyzeFile(filePath, compilerOptions, dependencies);
    saveResults(filePath, result);
  }));

  return results;
}




export async function analyzeFiles(options: IAnalyzeOptions): Promise<Result> {
  const { 
    compilerOptions, 
    files, 
    dependencies = [],
    enableWorker = false,
  } = options;
  let results: Result = new Map();

  if (!files.length) {
    console.log('请输入要分析的文件路径');
    return results;
  }

  const start = performance.now();
  if (enableWorker) {
    results = await workerAnalyzeFile(files, compilerOptions, dependencies);
    const end = performance.now();
    console.log(`⏱️  Worker analyze ${files.length} files in ${end - start} ms`)
  } else {
    results = await syncAnalyzeFile(files, compilerOptions, dependencies);
    const end = performance.now();
    console.log(`⏱️  Sync analyze ${files.length} files in ${end - start} ms`)
  }
  return results;
}