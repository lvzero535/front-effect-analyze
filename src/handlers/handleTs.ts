// tsFileAnalyzer.ts（完整更新版）
import * as ts from 'typescript';
import * as path from 'path';
import type { IDeclareVar, FileAnalyzeResult, VarType } from './types.js';
import { handleImportDeclaration, getNodeNormalizedHash,getVarType, isTsTypeNodeKind } from './helper.js';
import { resolveModuleSpecifier } from './resolveModuleSpecifier.js';
import { DeclareVar } from './DeclareVar.js';

import type { IAnalyzeAstOptions } from '../types.js';

export async function analyzeTsFile(options: IAnalyzeAstOptions): Promise<FileAnalyzeResult | undefined> {
  const { filePath, sourceFile, checker, compilerOptions, dependencies } = options;

  if (!sourceFile) {
    console.log(`analyzeTsFile: sourceFile is undefined, filePath: ${filePath}`);
    return;
  }
  // 打印 AST 树（调试用）
  // printAstTree(sourceFile, sourceFile);

  const result: FileAnalyzeResult = {
    path: filePath,
    moduleSpecifiers: [],
    declareVars: [],
    parentModules: [],
  };

  const moduleSpecifiers = new Set<string>();
  const currentDir = path.dirname(filePath);


  // 存储所有 导入和导出的 变量（name -> IDeclareVar）
  const effectVarMap = new Map<string, IDeclareVar>();

  

  // start 递归遍历 AST 节点，检测对 effectVarMap 中声明的引用
  function visit(node: ts.Node, decl: IDeclareVar) {
    if (ts.isIdentifier(node)) {
      const name = node.text;
      const existing = effectVarMap.get(name);
      // 避免将自身添加为依赖
      if (existing  && existing.name !== decl.name && existing.astNode) {
        const outerSymbol = checker.getSymbolAtLocation(existing.astNode);
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol === outerSymbol) {
          decl.dependencies.push(existing);
        }
      }
      // 避免将自身添加为依赖
      // if (existing && existing.name !== decl.name) {
      //   decl.dependencies.push(existing);
      // }
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
      const decls = handleImportDeclaration(node, compilerOptions, currentDir, dependencies);
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
        moduleSpecifier = resolveModuleSpecifier(raw, compilerOptions, currentDir, dependencies);
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
              astNode: el.propertyName || el.name,
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
              astNode: d.name,
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
          astNode: node.name,
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
