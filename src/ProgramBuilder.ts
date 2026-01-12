import ts from 'typescript';
import path from 'path';

type ProgramEntry = {
  program: ts.Program;
  checker: ts.TypeChecker;
  rootFiles: string[];
  options: ts.CompilerOptions;
};

export class ProgramBuilder {
  private cache = new Map<string, ProgramEntry>();

  /**
   * 获取（或创建）Program
   * 同一个 tsconfig 只会创建一次
   */
   async getProgram(tsconfigPath: string): Promise<ProgramEntry> {
    const absPath = path.resolve(tsconfigPath);

    if (this.cache.has(absPath)) {
      return this.cache.get(absPath)!;
    }

    const entry = await this.createProgram(absPath);
    this.cache.set(absPath, entry);
    return entry;
  }

  /**
   * 清理缓存（worker 退出前调用）
   */
  dispose() {
    this.cache.clear();
  }

  // ---------------- private ----------------

  private async createProgram(tsconfigPath: string): Promise<ProgramEntry> {
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
