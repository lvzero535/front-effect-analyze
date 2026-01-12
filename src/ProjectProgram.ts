import ts from 'typescript';
import path from 'path';
import { getFileContent } from './files.js';
import { IAnalyzeAstOptions } from './types.js';

type ProgramEntry = {
  program: ts.Program;
  checker: ts.TypeChecker;
  rootFiles: string[];
  options: ts.CompilerOptions;
};

export class ProjectProgram {

  private static instance: ProjectProgram | undefined;
  private static initializing: Promise<ProjectProgram> | undefined;
  private program: ts.Program;
  private packageJson: Record<string, any> = {};
  private dependencies: string[] = [];
  private tsconfigFileName: string = 'tsconfig.app.json'

  constructor(projectRoot: string, tsconfigFileName?: string) {
    this.tsconfigFileName = tsconfigFileName || this.tsconfigFileName;
    this.program = this.createProgram(projectRoot).program;
    // this.getPackageConfig(projectRoot);
  }

  public static async getInstance(projectRoot: string, tsconfigFileName?: string) {
    if (ProjectProgram.instance) {
      return ProjectProgram.instance;
    }
    console.log('create program getInstance ====>');
    if (ProjectProgram.initializing) {
      return ProjectProgram.initializing;
    }
    ProjectProgram.initializing = new Promise(async (resolve, reject) => {
      try {
        const instance = new ProjectProgram(projectRoot, tsconfigFileName);
        await instance.getPackageConfig(projectRoot);
        ProjectProgram.instance = instance;
        resolve(instance);
      } catch (error) {
        reject(error);
      } finally {
        ProjectProgram.initializing = undefined;
      }
    });
    return ProjectProgram.initializing;
  }

  private async getPackageConfig(projectRoot: string) {
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJsonContent = await getFileContent(packageJsonPath);
    const packageJson = JSON.parse(packageJsonContent);
    this.packageJson = packageJson;
    this.setDependencies();
  }

  /**
   * 获取 TypeChecker
   */
  getChecker(): ts.TypeChecker {
    return this.program.getTypeChecker();
  }

  /**
   * 获取 CompilerOptions
   */
  getOptions(): ts.CompilerOptions {
    return this.program.getCompilerOptions();
  }

  /**
   * 获取根文件
   */
  getRootFiles(): readonly string[] {
    return this.program.getRootFileNames();
  }
  
  /**
   * 获取项目依赖
   */
  setDependencies() {
    this.dependencies = Object.keys({
      ...(this.packageJson["dependencies"] || {}),
      ...(this.packageJson["devDependencies"] || {}),
      ...(this.packageJson["peerDependencies"] || {}),
    });
  }

  getDependencies(): string[] {
    return this.dependencies;
  }

  getAnalyzeOptions(
    filePath: string,
    getSourceFile?: (filePath: string) => ts.SourceFile,
    getChecker?: (filePath: string, options: ts.CompilerOptions) => ts.TypeChecker
  ): IAnalyzeAstOptions {
    const sourceFile = getSourceFile?.(filePath) || this.program.getSourceFile(filePath);
    return {
      filePath,
      sourceFile: sourceFile!,
      checker: getChecker?.(filePath, this.getOptions()) || this.getChecker(),
      compilerOptions: this.getOptions(),
      dependencies: this.getDependencies(),
    };
  }


  // ---------------- private ----------------

  private createProgram(projectRoot: string): ProgramEntry {
    const tsconfigPath = path.resolve(projectRoot, this.tsconfigFileName || 'tsconfig.json');
    const configFile = ts.readConfigFile(
      tsconfigPath,
      ts.sys.readFile
    );

    if (configFile.error) {
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(
          [configFile.error],
          {
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getCanonicalFileName: f => f,
            getNewLine: () => '\n',
          }
        )
      );
    }

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(tsconfigPath)
    );

    const program = ts.createProgram({
      rootNames: parsed.fileNames,
      options: parsed.options, //  
    });

    const checker = program.getTypeChecker();

    return {
      program,
      checker,
      rootFiles: parsed.fileNames,
      options: parsed.options,
    };
  }
}
