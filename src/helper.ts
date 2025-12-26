import path from "path";
import { FileAnalyzeResult } from "./handlers/types";
import fs from "fs";
import { getFileContent, writeFileContent } from "./files";
import { Result } from "./analyze";
import { EffectResult } from "./diff";
import { JsonFileSaveOptions } from "./types";

export function jsonToString(json: any, indent = 2): string {
  return JSON.stringify(json, null, indent);
}

export async function getAnalyzeJson(projectRoot: Required<JsonFileSaveOptions>): Promise<Result> {
  const { fileName , filePath } = projectRoot;
  const analyzeJsonPath = path.join(filePath, fileName);
  if (!fs.existsSync(analyzeJsonPath)) {
    console.log('analyze.json not found');
    return new Map();
  }
  const analyzeJsonContent = await getFileContent(analyzeJsonPath);
  const results = JSON.parse(analyzeJsonContent) as FileAnalyzeResult[];
  return new Map(results.map((item) => [item.path, item]));
}


export async function saveAnalyzeJson(analyzeJsonPath: Required<JsonFileSaveOptions>, results: FileAnalyzeResult[]) {
  const { fileName , filePath } = analyzeJsonPath;
  await writeFileContent(path.join(filePath, fileName), jsonToString(results));
}

export async function saveResultJson(resultJsonPath: Required<JsonFileSaveOptions>, results: EffectResult[]) {
  const { fileName , filePath } = resultJsonPath;
  await writeFileContent(path.join(filePath, fileName), jsonToString(results));
}

export function hasCommonElement<T>(arr1: T[], arr2: T[]): boolean {
  const set = new Set(arr1);
  for (const item of arr2) {
    if (set.has(item)) {
      return true;
    }
  }
  return false;
}


export function getCommonElements<T>(arr1: T[], arr2: T[]): T[] {
  const set = new Set(arr2);
  const result: T[] = [];

  for (const item of arr1) {
    if (set.has(item)) {
      result.push(item);
    }
  }

  return result;
}


export function resultToTree(results: Result) {
  for (const [filePath, result] of results) {
      result.moduleSpecifiers.forEach(parent => {
        const parentResult = results.get(parent);
        if (parentResult && !parentResult.parentModules.includes(filePath)) {
          parentResult.parentModules.push(filePath);
        }
      });
    }
}
