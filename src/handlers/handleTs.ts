import * as ts from 'typescript';
import type { IDeclareVar, FileAnalyzeResult } from './types.js';
import { createHandlers, type AnalysisContext } from './commonHandlers.js';
import { traverseNode } from './traversetNode.js';

import type { IAnalyzeAstOptions } from '../types.js';

export async function analyzeTsFile(options: IAnalyzeAstOptions): Promise<FileAnalyzeResult | undefined> {
  const { filePath, sourceFile, checker, compilerOptions, dependencies } = options;

  if (!sourceFile) {
    console.log(`analyzeTsFile: sourceFile is undefined, filePath: ${filePath}`);
    return;
  }

  const result: FileAnalyzeResult = {
    path: filePath,
    moduleSpecifiers: [],
    declareVars: [],
    parentModules: [],
  };

  // 创建分析上下文
  const context: AnalysisContext = {
    sourceFile,
    filePath,
    checker,
    compilerOptions,
    dependencies,
    declareVars: result.declareVars,
    moduleSpecifiers: new Set<string>(),
    variableMap: new Map<string, IDeclareVar>(),
  };

  // 创建处理器
  const handlers = createHandlers(context);

  // 递归遍历 AST 树
  traverseNode(sourceFile, handlers, undefined, false);

  // 处理依赖关系分析
  analyzeDependencies(context);

  // 将 moduleSpecifiers Set 转换为数组
  result.moduleSpecifiers = Array.from(context.moduleSpecifiers);

  return result;
}

/**
 * 分析声明变量之间的依赖关系
 * 通过遍历每个声明的定义，找出其引用的其他声明
 */
function analyzeDependencies(context: AnalysisContext) {
  const { declareVars, checker } = context;

  declareVars.forEach(decl => {
    if (!decl.astNode) return;

    // 查找声明的初始化器或实现体
    decl.astNode.pendingNodes?.forEach(child => 
      visitNodeForDependencies(child, decl, context.variableMap, checker)
    );
  });
}

/**
 * 遍历节点以收集依赖关系
 */
function visitNodeForDependencies(
  node: ts.Node,
  decl: IDeclareVar,
  variableMap: Map<string, IDeclareVar>,
  checker: ts.TypeChecker
) {
  if (ts.isIdentifier(node)) {
    const name = node.text;
    const existing = variableMap.get(name);

    // 避免循环依赖和自引用
    if (existing && existing.name !== decl.name && existing.astNode?.symbol) {
      try {
        const outerSymbol = checker.getSymbolAtLocation(existing.astNode.symbol);
        const symbol = checker.getSymbolAtLocation(node);
        if (symbol === outerSymbol && !decl.dependencies.includes(existing.name)) {
          decl.dependencies.push(existing.name);
        }
      } catch (e) {
        // 类型检查可能失败，忽略
      }
    }
  }

  node.forEachChild(child => visitNodeForDependencies(child, decl, variableMap, checker));
}
