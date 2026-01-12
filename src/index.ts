import path from "path";
import { analyzeFiles } from "./analyze.js";
import { getAnalyzeJson, resultToTree, saveAnalyzeJson, saveResultJson } from "./helper.js";
import { diffAnalyzeJson } from "./diff.js";
import type { IOptions, Result } from "./types.js";
import { traverseFiles } from "./files.js";

function normalizeOptions(options: IOptions) {
  const { projectRoot, analyzeJsonFile, resultJsonFile, isFullAnalyze = true, fileOps } = options;
  return {
    ...options,
    modifiedFiles: options.modifiedFiles || [],
    analyzeJsonFile: {
      fileName: analyzeJsonFile?.fileName || "analyzeJson.json",
      filePath: analyzeJsonFile?.filePath || projectRoot,
    },
    resultJsonFile: {
      fileName: resultJsonFile?.fileName || "resultJson.json",
      filePath: resultJsonFile?.filePath || projectRoot,
    },
    fileOps: {
      includeExtensions: fileOps?.includeExtensions || [".ts", ".js", ".vue"],
      excludeDirs: fileOps?.excludeDirs || [],
      excludeExtensions: fileOps?.excludeExtensions || [],
    },
  };
}

export async function start(options: IOptions) {
  const normalized = normalizeOptions(options);
  const { projectRoot, analyzeJsonFile, resultJsonFile, modifiedFiles, isFullAnalyze, fileOps } = normalized;


  if (isFullAnalyze) {
    const files = await traverseFiles(projectRoot, fileOps);
    // 全量分析
    const results = await analyzeFiles({
      projectRoot,
      enableWorker: options.enableWorker,
      files,
    });
    resultToTree(results);
    saveAnalyzeJson(analyzeJsonFile, Array.from(results.values()));
    return; // 全量分析完成后，返回
  }

  
  const filteredModifiedFiles = modifiedFiles.filter(file => fileOps.includeExtensions.includes(path.extname(file)));

  if (!filteredModifiedFiles.length) {
    console.log('增量分析文件为空，返回');
    return; // 增量分析文件为空，返回
  }


  const modifiedResults = await analyzeFiles({
      projectRoot,
      enableWorker: options.enableWorker,
      files: filteredModifiedFiles,
    });

  const tempResult: Result = new Map();

  // 全量分析的内容，增量分析时需要使用
  const analyzedJson = await getAnalyzeJson(analyzeJsonFile);

  // 合并增量分析结果和全量分析结果
  for (const [filePath, result] of analyzedJson) {
    // 增量分析结果中没有的文件，直接使用全量分析结果
    if (modifiedResults.has(filePath)) {
      tempResult.set(filePath, modifiedResults.get(filePath)!);
    } else {
      tempResult.set(filePath, result);
    }
  }

  // 增量分析结果，收集依赖
  resultToTree(tempResult);

  for (const [filePath] of modifiedResults) {
    modifiedResults.set(filePath, tempResult.get(filePath)!);
  }

  const { analyzeJson, result } = diffAnalyzeJson(analyzedJson, modifiedResults);

  // 分析后，重新保存diffJson
  saveAnalyzeJson(analyzeJsonFile, Array.from(analyzeJson.values()));
  saveResultJson(resultJsonFile, Array.from(result.values()));

}
