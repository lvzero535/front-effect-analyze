import type { FileAnalyzeResult } from "./handlers/types.js";

export interface TraverseOptions {
  excludeExtensions?: string[];
  excludeDirs?: string[];
  includeExtensions?: string[];
}

export interface ICompilerOptions { 
  baseUrl?: string; 
  paths: Record<string, string[]>;
}

export interface ProjectFilesOptions extends TraverseOptions {
  tsconfigFileName?: string;
  isTraverseFile?: boolean;
}


export interface JsonFileSaveOptions {
  /** JSON文件名, 默认为analyzeJson.json, 结果JSON文件名, 默认为resultJson.json */
  fileName?: string;
  /** JSON文件路径, 默认为项目根目录 */
  filePath?: string; 
}

export interface IOptions {
  /** 项目根目录 */
  projectRoot: string;
  /** 项目文件操作选项 */
  fileOps?: ProjectFilesOptions;
  /** 分析结果JSON文件选项 */
  analyzeJsonFile?: JsonFileSaveOptions;
  /** 结果JSON文件选项 */
  resultJsonFile?: JsonFileSaveOptions;
  /** 修改的文件列表 */
  modifiedFiles?: string[];
  /** 是否全量分析 */
  isFullAnalyze?: boolean;
  /** 是否启用Worker线程 */
  enableWorker?: boolean;
}

export interface EffectResult {
  path: string;
  effectPaths: { name: string; paths: string[] }[];
}

export type Result = Map<string, FileAnalyzeResult>;
export interface IAnalyzeOptions {
  compilerOptions: ICompilerOptions;
  files: string[];
  dependencies: string[];
  enableWorker?: boolean;
}