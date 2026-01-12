import { parse } from "@vue/compiler-sfc";
import { getFileContent } from "../files.js";
import ts from "typescript";

export async function getVueSourceFile(filePath: string): Promise<ts.SourceFile | undefined> {
  const sourceCode = await getFileContent(filePath);
  const parsed = parse(sourceCode);

  if (parsed.descriptor.script || parsed.descriptor.scriptSetup) {
    const sourceFile = ts.createSourceFile(
      filePath,
      parsed.descriptor.scriptSetup!.content || parsed.descriptor.script!.content,
      ts.ScriptTarget.Latest,
      true,
      // ts.ScriptKind.TSX
    );
    return sourceFile;
  }
  return undefined;
}

