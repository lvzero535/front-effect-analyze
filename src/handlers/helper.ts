import * as crypto from 'crypto';
import ts from "typescript";
import { IDeclareVar, VarType } from "./types";
import { DeclareVar } from "./DeclareVar";
import { resolveModuleSpecifier } from "./resolveModuleSpecifier";

export function handleImportDeclaration(
  node: ts.ImportDeclaration,
  tsconfig: { baseUrl?: string; paths: Record<string, string[]> },
  currentFileDir: string,
  installDeps: string[]): IDeclareVar[] {

  const IDeclareVars: IDeclareVar[] = [];

  // get module specifier and resolve it
  const moduleSpecifier = node.moduleSpecifier.getText().replace(/^['"`]|['"`]$/g, '');

  const importPath = resolveModuleSpecifier(moduleSpecifier, tsconfig, currentFileDir, installDeps);

  // get import clause
  const importClause = node.importClause;
  if (!importClause) return IDeclareVars;

  // default import: import X from 'module'
  if (importClause.name) {
    IDeclareVars.push(new DeclareVar({
      name: importClause.name.text,
      type: 'const',
      isExported: false,
      isImported: true,
      moduleSpecifier: importPath,
    }));
  }

  // namespace import: import * as X from 'module'
  if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
    IDeclareVars.push(new DeclareVar({
      name: importClause.namedBindings.name.text,
      type: 'const',
      isExported: false,
      isImported: true,
      moduleSpecifier: importPath,
    }));
  }

  // named imports: import { A, B as C } from 'module'
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    importClause.namedBindings.elements.forEach((element) => {
      const localName = element.name.text;
      IDeclareVars.push(new DeclareVar({
        name: localName,
        type: 'const',
        isExported: false,
        isImported: true,
        moduleSpecifier: importPath,
      }));
    });
  }

  return IDeclareVars;
}

export function handleExportDeclaration(
  node: ts.ExportDeclaration,
  tsconfig: { baseUrl?: string; paths: Record<string, string[]> },
  currentFileDir: string,
  installDeps: string[]){
}

/**
 * 根据节点和是否为 TS 类型节点判断声明的 VarType
 */
export function getVarType(node: ts.Node, isTsTypeNode: boolean): VarType {
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';

  if (isTsTypeNode) {
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    return 'enum';
  }

  // If the node is a variable statement, check if its initializer is a function (arrow or function expression).
  if (ts.isVariableStatement(node)) {
    for (const d of node.declarationList.declarations) {
      const init = d.initializer;
      if (init && (ts.isFunctionExpression(init) || ts.isArrowFunction(init))) return 'function';
    }
    const flags = node.declarationList.flags;
    if (flags & ts.NodeFlags.Const) return 'const';
    if (flags & ts.NodeFlags.Let) return 'let';
    return 'var';
  }

  // If a VariableDeclaration node is passed directly, also detect function-valued initializer.
  if (ts.isVariableDeclaration(node)) {
    const init = node.initializer;
    if (init && (ts.isFunctionExpression(init) || ts.isArrowFunction(init))) return 'function';
  }

  // Fallback for unexpected nodes
  // @ts-ignore
  if ((node as any).declarationList) {
    // @ts-ignore
    const flags = (node as any).declarationList.flags || 0;
    if (flags & ts.NodeFlags.Const) return 'const';
    if (flags & ts.NodeFlags.Let) return 'let';
  }

  return 'var';
}

/**
 * 判断节点是否为 TS 的类型声明（interface / type alias / enum）
 */
export function isTsTypeNodeKind(node: ts.Node): boolean {
  return ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node);
}

/**
 * 遍历 AST 并打印层级关系
 * @param node 当前 AST 节点
 * @param sourceFile SourceFile
 * @param depth 当前层级
 */
export function printAstTree(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  depth = 0
) {
  const indent = '  '.repeat(depth)
  const kindName = ts.SyntaxKind[node.kind]

  // 可选：打印节点文本（如变量名、函数名）
  const text = ts.isSourceFile(node) ? '' : node.getText(sourceFile)
    .replace(/\s+/g, ' ')
    .slice(0, 40)

  console.log(`${indent}${kindName}${text ? `: ${text}` : ''}`)

  node.forEachChild(child =>{
    
    if (depth === 1) return;

    printAstTree(child, sourceFile, depth + 1)
  })
}

// 可选：传入一个 Set 来过滤需要判断的节点类型（默认不过滤，全计算）
export function getNodeNormalizedHash(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  filterKinds?: Set<ts.SyntaxKind>
): string {
  if (filterKinds && !filterKinds.has(node.kind)) {
    return ''; // 如果不在过滤列表中，跳过（视为未修改或不关心）
  }

  // 创建规范化打印器：忽略注释、统一换行
  const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
    omitTrailingSemicolon: true,
    noEmitHelpers: true,
  });

  // 打印节点的规范化代码（EmitHint.Unspecified 表示打印完整节点）
  const normalizedCode = printer.printNode(ts.EmitHint.Unspecified, node, sourceFile).trim();

  if (!normalizedCode) {
    return '';
  }

  // 计算 SHA256 hash
  return crypto.createHash('sha256').update(normalizedCode).digest('hex');
}

