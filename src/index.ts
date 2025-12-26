import path from "path";
import {Analyze, Result} from "./analyze";
import { getAnalyzeJson, resultToTree, saveAnalyzeJson, saveResultJson } from "./helper";
import { loadProjectFiles } from "./projectFiles";
import { diffAnalyzeJson } from "./diff";
import { IOptions } from "./types";

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
      tsconfigFileName: fileOps?.tsconfigFileName || "tsconfig.json",
      // 是否遍历文件，全量分析时为true，增量分析时为false
      isTraverseFile: fileOps?.isTraverseFile || isFullAnalyze,
    },
  };
}

export async function start(options: IOptions) {
  const normalized = normalizeOptions(options);
  const { projectRoot, analyzeJsonFile, resultJsonFile, modifiedFiles, isFullAnalyze, fileOps } = normalized;

  const projectFiles = await loadProjectFiles(projectRoot, fileOps);

  let analyzedJson: Result = new Map();

  if (isFullAnalyze) {
    // 全量分析
    new Analyze(projectFiles, (results) => {
      analyzedJson = results;
      saveAnalyzeJson(analyzeJsonFile, Array.from(results.values()));
    });
    return; // 全量分析完成后，返回
  } else {
    analyzedJson = await getAnalyzeJson(analyzeJsonFile);
  }

  const filteredModifiedFiles = modifiedFiles.filter(file => fileOps.includeExtensions.includes(path.extname(file)));

  // 增量分析，只分析modifyFiles中的文件
  filteredModifiedFiles.length && new Analyze({
    ...projectFiles,
    files: filteredModifiedFiles,
  }, (results) => {

    const tempResult: Result = new Map();

    // 合并增量分析结果和全量分析结果
    for (const [filePath, result] of analyzedJson) {
      // 增量分析结果中没有的文件，直接使用全量分析结果
      if (results.has(filePath)) {
        tempResult.set(filePath, results.get(filePath)!);
      } else {
        tempResult.set(filePath, result);
      }
    }

    resultToTree(tempResult);

    for (const [filePath] of results) {
      results.set(filePath, tempResult.get(filePath)!);
    }

    const { analyzeJson, result } = diffAnalyzeJson(analyzedJson, results);

    // 分析后，重新保存diffJson
    saveAnalyzeJson(analyzeJsonFile, Array.from(analyzeJson.values()));
    saveResultJson(resultJsonFile, Array.from(result.values()));
  });

}
