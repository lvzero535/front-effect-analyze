// tsFileAnalyzer.ts（完整更新版）
import * as ts from 'typescript';
import * as path from 'path';
import { IDeclareVar, FileAnalyzeResult, VarType, ITsConfig } from './types';
import { getFileContent } from '@/files';
import { handleImportDeclaration, printAstTree, getNodeNormalizedHash,getVarType, isTsTypeNodeKind } from './helper';
import { resolveModuleSpecifier } from './resolveModuleSpecifier';
import { DeclareVar } from './DeclareVar';

import { parse, compileTemplate, compileScript, registerTS } from "@vue/compiler-sfc";

async function getSourceFile(filePath: string): Promise<ts.SourceFile> {
  const sourceCode = await getFileContent(filePath);
  if (filePath.endsWith('.vue')) {
    const parsed = parse(sourceCode);

    if (parsed.descriptor.script || parsed.descriptor.scriptSetup) {
      registerTS(() => ts);
      // const scriptResult = compileScript(parsed.descriptor, { id: filePath });
      const sourceFile = ts.createSourceFile(
        filePath,
        parsed.descriptor.scriptSetup!.content,
        ts.ScriptTarget.Latest,
        true,
        // ts.ScriptKind.TSX
      )
      return sourceFile;
    }
  }
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
  return sourceFile;
}

export async function analyzeTsFile(
  filePath: string,
  tsconfig: ITsConfig,
  installDeps: string[] = []): Promise<FileAnalyzeResult> {

  // const sourceCode = await getFileContent(filePath);
  // const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
  const sourceFile = await getSourceFile(filePath);

  // 打印 AST 树（调试用）
  // printAstTree(sourceFile, sourceFile);

  const result: FileAnalyzeResult = {
    path: filePath,
    fileType: filePath.endsWith('.vue') ? 'vue' : filePath.endsWith('.js') ? 'js' : 'ts',
    moduleSpecifiers: [],
    declareVars: [],
    parentModules: [],
  };



  const moduleSpecifiers = new Set<string>();
  const currentDir = path.dirname(filePath);

  // 创建 Program 和 TypeChecker（用于符号检查）
  const program = ts.createProgram([filePath], {});
  const checker = program.getTypeChecker();

  // 存储所有 导入和导出的 变量（name -> IDeclareVar）
  const effectVarMap = new Map<string, IDeclareVar>();

  

  // start 递归遍历 AST 节点，检测对 effectVarMap 中声明的引用
  function visit(node: ts.Node, decl: IDeclareVar) {
    if (ts.isIdentifier(node)) {
      const name = node.text;
      const existing = effectVarMap.get(name);
      // 避免将自身添加为依赖
      if (existing && existing.name !== decl.name) {
        decl.dependencies.push(existing);
      }
    }
    node.forEachChild(child => visit(child, decl));
  }

  const effectFns: Function[] = [];

  function addEffectFn(node: ts.Node, decl: IDeclareVar) {
    if (ts.isArrowFunction(node) || ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
      node.body && effectFns.push(() => visit(node.body!, decl));
    }
  }
  // end


  sourceFile.forEachChild(node => {
    // 这里返回true后，会禁止了下次的遍历

    // import declarations
    if (ts.isImportDeclaration(node) && node.importClause) {
      const decls = handleImportDeclaration(node, tsconfig, currentDir, installDeps);
      for (const decl of decls) {
        // compute astHash for import-created decls
        try { decl.astHash = getNodeNormalizedHash(node, sourceFile); } catch (e) {}
        result.declareVars.push(decl);
        if (decl.moduleSpecifier) moduleSpecifiers.add(decl.moduleSpecifier);
        effectVarMap.set(decl.name, decl);
      }
      return;
    }

    // export declarations (export { A } from 'x' or export { A })
    if (ts.isExportDeclaration(node)) {
      let moduleSpecifier = undefined;
      if (node.moduleSpecifier) {
        const raw = node.moduleSpecifier.getText().slice(1, -1);
        moduleSpecifier = resolveModuleSpecifier(raw, tsconfig, currentDir, installDeps);
        moduleSpecifiers.add(moduleSpecifier);
      }

      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(el => {
          const name = el.propertyName?.text || el.name.text;
          const existing = result.declareVars.find(d => d.name === name);
          if (existing) {
            existing.isExported = true;
            effectVarMap.set(name, existing);
          } else {
            const decl: IDeclareVar = {
              name,
              type: 'const',
              isExported: true,
              isImported: true,
              isTsType: false,
              moduleSpecifier,
              astHash: getNodeNormalizedHash(node, sourceFile),
              dependencies: [],
            };
            result.declareVars.push(decl);
            effectVarMap.set(name, decl);
          }
        });
      }
      return;
    }

    if (
      ts.isVariableStatement(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const isExported = !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const isTsTypeNode = isTsTypeNodeKind(node);

      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(d => {
          if (ts.isIdentifier(d.name)) {
            const name = d.name.text;
            const type: VarType = getVarType(d, isTsTypeNode);
            const decl: IDeclareVar = new DeclareVar({
              name,
              type,
              isExported,
              isTsType: isTsTypeNode,
              astHash: d.initializer ? getNodeNormalizedHash(d.initializer, sourceFile) : '',
            });
            result.declareVars.push(decl);
            effectVarMap.set(name, decl);
            addEffectFn(d.initializer || d, decl);
          };
        });
      } else {
        const name = node.name?.text || '';
        const type: VarType = getVarType(node, isTsTypeNode);
        const decl: IDeclareVar = new DeclareVar({
          name,
          type,
          isExported,
          isTsType: isTsTypeNode,
          astHash: getNodeNormalizedHash(node, sourceFile),
        });
        result.declareVars.push(decl);
        effectVarMap.set(name, decl);
        addEffectFn(node, decl);
      }

    }
  });


  effectFns.forEach(fn => fn());
  
  result.moduleSpecifiers = Array.from(moduleSpecifiers);
  return result;
}
