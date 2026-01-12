import fs from 'fs';
import { parse, compileScript } from '@vue/compiler-sfc';
import ts from 'typescript';

function parseVueSFC(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { descriptor } = parse(content, { filename: filePath });
  return descriptor;
}

function compileVueToTS(descriptor, filePath: string) {
  const compiled = compileScript(descriptor, {
    id: filePath,
    // 重要：开启 TS
    babelParserPlugins: ['typescript'],
  });

  return compiled.content; // ✅ 这是纯 TS 代码
}


function createVueSourceFile(
  filePath: string,
  tsCode: string
): ts.SourceFile {
  return ts.createSourceFile(
    filePath + '.ts', // ⚠️ 虚拟后缀
    tsCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

export function vueSFCToSourceFile(filePath: string): ts.SourceFile | null {
  const descriptor = parseVueSFC(filePath);

  if (!descriptor.script && !descriptor.scriptSetup) {
    return null;
  }

  const tsCode = compileVueToTS(descriptor, filePath);

  return createVueSourceFile(filePath, tsCode);
}


export function createVueCompilerHost(
  options: ts.CompilerOptions
): ts.CompilerHost {
  const host = ts.createCompilerHost(options);

  const originalGetSourceFile = host.getSourceFile;

  const originalReadFile = host.readFile;
  host.readFile = (fileName) => {
    if (fileName.endsWith('.vue')) {
      console.log('read file: ', fileName);
    }
    return originalReadFile(fileName);
  };

  host.getSourceFile = (fileName, lang, ...rest) => {
    // console.log('get source file: ', fileName);
    if (fileName.endsWith('.vue')) {
      const sf = vueSFCToSourceFile(fileName);
      return sf ?? undefined;
    }
    return originalGetSourceFile.call(
      host,
      fileName,
      lang,
      ...rest
    );
  };

  return host;
}
