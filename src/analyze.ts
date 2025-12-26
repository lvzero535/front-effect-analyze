import path from "path";
import { analyzeTsFile } from "./handlers/handleTs";
import { FileAnalyzeResult } from "./handlers/types";
import { handleVue } from "./handlers/handleVue";
import { isFileExist } from "./files";
import { resultToTree } from "./helper";


/**
 * 分析项目根目录下的所有文件
 */
export interface AnalyzeOptions {
  tsconfigJson: Record<string, any>;
  packageJson: Record<string, any>;
  files: string[];
}

export type Result = Map<string, FileAnalyzeResult>;

export class Analyze {
  tsconfigJson: Record<string, any> = {};
  packageJson: Record<string, any> = {};
  allFiles: string[] = [];
  results: Result = new Map();
  success: (result: Result) => void = () => {};

  constructor(options: AnalyzeOptions, success: (result: Result) => void = () => {}) {
    this.tsconfigJson = options.tsconfigJson;
    this.packageJson = options.packageJson;
    this.allFiles = options.files;
    this.success = success;
    this.analyzeFiles();
  }

  analyzeFiles() {
    // web worker
    for (const filePath of this.allFiles) {
      if (!isFileExist(filePath)) {
        this.saveResults(filePath, {
          path: filePath,
          fileType: 'ts',
          moduleSpecifiers: [],
          declareVars: [],
          parentModules: [],
          notExist: true,
        });
        continue;
      }
      const ext = path.extname(filePath);
      switch (ext) {
        case ".ts":
        case ".tsx":
          this.analyzeTsFile(filePath);
          break;
        case ".js":
        case ".jsx":
          this.analyzeJsFile(filePath);
          break;
        case ".vue":
          this.analyzeVueFile(filePath);
          break;
        default:
          break;
      }
    }
  }

  saveResults(filePath: string, result: FileAnalyzeResult) {
    this.results.set(filePath, result);
    console.log('已分析文件/总文件', this.results.size, this.allFiles.length);
    if (this.results.size === this.allFiles.length) {
      console.log('分析完成');
      resultToTree(this.results);
      this.success(this.results);
    }
  }

  private async analyzeTsFile(filePath: string) {
    const result = await analyzeTsFile(filePath, this.tsconfigJson.compilerOptions, this.dependencies);
    this.saveResults(filePath, result);
  }

  private analyzeJsFile(filePath: string) {
    console.log("analyzeJsFile", filePath);
  }

  private async analyzeVueFile(filePath: string) {
    const result = await handleVue(filePath, this.tsconfigJson.compilerOptions, this.dependencies);
    if (result) {
      this.saveResults(filePath, result);
    } else {
      console.log('分析vue文件失败', filePath);
      this.saveResults(filePath, {
        path: filePath,
        fileType: 'vue',
        moduleSpecifiers: [],
        declareVars: [],
        parentModules: [],
      });
    }

  }

  get dependencies(): string[] {
    return Object.keys( {
      ...(this.packageJson["dependencies"] || {}),
      ...(this.packageJson["devDependencies"] || {}),
      ...(this.packageJson["peerDependencies"] || {}),
    });
  }

  get baseUrl() {
    return this.tsconfigJson.compilerOptions?.baseUrl || "";
  }

  get paths() {
    return this.tsconfigJson.compilerOptions?.paths || {};
  }

}