import path from "path";
import { getFileContent, traverseFiles, TraverseOptions, writeFileContent } from "./files";
import { analyzeTsFile } from "./handlers/handleTs";
import { FileAnalyzeResult } from "./handlers/types";
import { handleVue } from "./handlers/handleVue";
import { jsonToString } from "./helper";

interface AnalyzeOptions {
  fileOps?: TraverseOptions;
  tsconfigFileName?: string;
  files?: string[];
}

export class Analyze {
  tsconfig: Record<string, any> = {};
  packageJson: Record<string, any> = {};
  allFiles: string[] = [];
  results: Map<string, FileAnalyzeResult> = new Map();

  constructor(private projectRoot: string, options: AnalyzeOptions = {
    fileOps: {
      includeExtensions: [".ts", ".vue"],
      excludeDirs: ["node_modules", ".git", 'dist', 'build', '.vscode'],
    },
    tsconfigFileName: "tsconfig.app.json",
  }) {
    this.projectRoot = projectRoot;
    this.init(options);
  }

  async init(options: AnalyzeOptions) {
    await this.getTsconfigConfig(options.tsconfigFileName || "tsconfig.json");
    await this.getPackageConfig();
    this.allFiles = options.files || await traverseFiles(this.projectRoot, options.fileOps || {});
    this.analyzeFiles();
  }
  /**
   * 分析项目根目录下的所有文件
   */

  async getTsconfigConfig(tsconfigFileName: string) {
    const tsconfigPath = path.join(this.projectRoot, tsconfigFileName);
    const tsconfigContent = await getFileContent(tsconfigPath);
    this.tsconfig = JSON.parse(tsconfigContent);
  }

  async getPackageConfig() {
    const packageJsonPath = path.join(this.projectRoot, "package.json");
    const packageJsonContent = await getFileContent(packageJsonPath);
    this.packageJson = JSON.parse(packageJsonContent);
  }

  analyzeFiles() {
    // web worker
    for (const filePath of this.allFiles) {
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

  toTree() {
    for (const [filePath, result] of this.results) {
      result.moduleSpecifiers.forEach(parent => {
        const parentResult = this.results.get(parent);
        if (parentResult) {
          parentResult.parentModules.push(filePath);
        }
      });
    }
  }

  saveResults(filePath: string, result: FileAnalyzeResult) {
    this.results.set(filePath, result);
    console.log('已分析文件/总文件', this.results.size, this.allFiles.length);
    if (this.results.size === this.allFiles.length) {
      console.log('分析完成');
      this.toTree();
      writeFileContent("./analyze.json", jsonToString(Array.from(this.results.values())));
      // console.log(this.results);
    }
  }

  private async analyzeTsFile(filePath: string) {
    const result = await analyzeTsFile(filePath, this.tsconfig.compilerOptions, this.dependencies);
    this.saveResults(filePath, result);
  }

  private analyzeJsFile(filePath: string) {
    console.log("analyzeJsFile", filePath);
  }

  private async analyzeVueFile(filePath: string) {
    const result = await handleVue(filePath, this.tsconfig.compilerOptions, this.dependencies);
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
      ...this.packageJson["dependencies"],
      ...this.packageJson["devDependencies"],
      ...this.packageJson["peerDependencies"],
    });
  }

  get baseUrl() {
    return this.tsconfig.compilerOptions?.baseUrl || "";
  }

  get paths() {
    return this.tsconfig.compilerOptions?.paths || {};
  }

}