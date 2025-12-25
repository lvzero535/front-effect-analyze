import { parse, compileTemplate, compileScript, registerTS } from "@vue/compiler-sfc";
import { getFileContent } from "@/files";
import ts from "typescript";
import { ITsConfig } from "./types";
import { analyzeTsFile } from "./handleTs";


export async function handleVue(path: string, tsConfig: ITsConfig, installDeps: string[] = []) {
  const code = await getFileContent(path);
  const parsed = parse(code);
  if (parsed.descriptor.template) {
    const templateResult = compileTemplate({
      source: parsed.descriptor.template.content,
      id: path ,
      filename: path,
    });
    // console.log(templateResult);
  }
  if (parsed.descriptor.script || parsed.descriptor.scriptSetup) {
    // registerTS(() => ts);
    // const scriptResult = compileScript(parsed.descriptor, { id: path });
    // const sourceFile = ts.createSourceFile(
    //   path,
    //   scriptResult.content,
    //   ts.ScriptTarget.Latest,
    //   true,
    //   // ts.ScriptKind.TSX
    // )
    // console.log(sourceFile)
    const result = await analyzeTsFile(path, tsConfig, installDeps);
    return result;
  }
}

