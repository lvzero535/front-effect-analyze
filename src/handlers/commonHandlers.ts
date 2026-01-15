import ts from 'typescript';
import path from 'path';
import type { Handlers, IDeclareVar } from './types.js';
import { handleImportDeclaration, getVarType, isTsTypeNodeKind, getNodeNormalizedHash } from './helper.js';
import { DeclareVar } from './DeclareVar.js';
import { resolveModuleSpecifier } from './resolveModuleSpecifier.js';

/**
 * 分析上下文 - 存储分析过程中的各种数据
 */
export interface AnalysisContext {
  // 源文件信息
  sourceFile: ts.SourceFile;
  filePath: string;

  // 编译信息
  checker: ts.TypeChecker;
  compilerOptions: ts.CompilerOptions;

  // 分析结果收集
  declareVars: IDeclareVar[];
  moduleSpecifiers: Set<string>;

  // 临时存储 - 用于依赖分析
  variableMap: Map<string, IDeclareVar>;

  // 配置选项
  dependencies: string[];
}

/**
 * 创建一组 AST 节点处理器，按功能分类组织
 * handlers 的键为 `ts.SyntaxKind[node.kind]` 的名称
 *
 * 使用方式:
 * ```typescript
 * const context: AnalysisContext = { ... };
 * const handlers = createHandlers(context);
 * traverseNode(sourceFile, handlers, context);
 * ```
 */
export function createHandlers(context: AnalysisContext): Handlers {
  return {
    // ========== 导入声明处理 ==========
    [ts.SyntaxKind.ImportDeclaration](node: ts.Node) {
      const importNode = node as ts.ImportDeclaration;
      const decls = handleImportDeclaration(
        importNode,
        context.compilerOptions,
        path.dirname(context.filePath),
        context.dependencies
      );
      
      for (const decl of decls) {
        try { 
          decl.astHash = getNodeNormalizedHash(importNode, context.sourceFile); 
        } catch (e) {}
        context.declareVars.push(decl);
        if (decl.moduleSpecifier) context.moduleSpecifiers.add(decl.moduleSpecifier);
        context.variableMap.set(decl.name, decl);
      }
      // 返回 true 阻止遍历子节点（import声明通常没有重要的子节点）
      return true;
    },
    // ========== 导出声明处理 ==========
    [ts.SyntaxKind.ExportDeclaration](node: ts.Node) {
      const exportNode = node as ts.ExportDeclaration;
      let moduleSpecifier: string | undefined;
      
      // 处理 export ... from 'x' 的情况
      if (exportNode.moduleSpecifier) {
        const raw = exportNode.moduleSpecifier.getText().slice(1, -1);
        moduleSpecifier = resolveModuleSpecifier(
          raw,
          context.compilerOptions,
          path.dirname(context.filePath),
          context.dependencies
        );
        context.moduleSpecifiers.add(moduleSpecifier);
      }

      // 处理 export { A, B } 或 export { A } from 'x'
      if (exportNode.exportClause && ts.isNamedExports(exportNode.exportClause)) {
        exportNode.exportClause.elements.forEach(el => {
          const name = el.propertyName?.text || el.name.text;
          const existing = context.declareVars.find(d => d.name === name);
          
          if (existing) {
            existing.isExported = true;
            context.variableMap.set(name, existing);
          } else {
            const decl: IDeclareVar = {
              name,
              type: 'const',
              isExported: true,
              isImported: true,
              isTsType: false,
              moduleSpecifier,
              astHash: getNodeNormalizedHash(exportNode, context.sourceFile),
              dependencies: [],
              astNode: {
                symbol: el.propertyName || el.name,
              },
            };
            context.declareVars.push(decl);
            context.variableMap.set(name, decl);
          }
        });
      }
      
      return true;
    },
    // ========== 变量声明处理 ==========
    [ts.SyntaxKind.VariableStatement](node: ts.Node) {
      const varNode = node as ts.VariableStatement;
      const isExported = !!varNode.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);

      varNode.declarationList.declarations.forEach(d => {
        if (ts.isIdentifier(d.name)) {
          const name = d.name.text;
          const type = getVarType(d, false);
          const decl = new DeclareVar({
            name,
            type,
            isExported,
            isTsType: false,
            astHash: d.initializer ? getNodeNormalizedHash(d.initializer, context.sourceFile) : '',
            astNode: {
              symbol: d.name,
              pendingNodes: d.initializer ? [d.initializer] : undefined,
            },
          });
          context.declareVars.push(decl);
          context.variableMap.set(name, decl);
        }
      });
    },
    // ========== 函数声明处理 ==========
    [ts.SyntaxKind.FunctionDeclaration](node: ts.Node) {
      const funcNode = node as ts.FunctionDeclaration;
      const isExported = !!funcNode.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const name = funcNode.name?.text || '';
      const decl = new DeclareVar({
        name,
        type: 'function',
        isExported,
        isTsType: false,
        astHash: getNodeNormalizedHash(funcNode, context.sourceFile),
        astNode: {
          symbol: funcNode.name,
          pendingNodes: funcNode.body ? [funcNode.body, ...funcNode.parameters] : undefined,
        },
      });
      context.declareVars.push(decl);
      context.variableMap.set(name, decl);
    },
    // ========== 类声明处理 ==========
    [ts.SyntaxKind.ClassDeclaration](node: ts.Node) {
      const classNode = node as ts.ClassDeclaration;
      const isExported = !!classNode.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const name = classNode.name?.text || '';

      const decl = new DeclareVar({
        name,
        type: 'class',
        isExported,
        isTsType: false,
        astHash: getNodeNormalizedHash(classNode, context.sourceFile),
        astNode: {
          symbol: classNode.name,
          pendingNodes: [...(classNode.heritageClauses || []), ...classNode.members],
        },
      });
      context.declareVars.push(decl);
      context.variableMap.set(name, decl);
    },
    // ========== 接口声明处理 ==========
    [ts.SyntaxKind.InterfaceDeclaration](node: ts.Node) {
      const ifaceNode = node as ts.InterfaceDeclaration;
      const isExported = !!ifaceNode.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const name = ifaceNode.name?.text || '';

      const decl: IDeclareVar = new DeclareVar({
        name,
        type: 'interface',
        isExported,
        isTsType: true,
        astHash: getNodeNormalizedHash(ifaceNode, context.sourceFile),
        astNode: {
          symbol: ifaceNode.name,
          pendingNodes: [...(ifaceNode.heritageClauses || []), ...ifaceNode.members],
        },
      });
      context.declareVars.push(decl);
      context.variableMap.set(name, decl);
    },
    // ========== 类型别名处理 ==========
    [ts.SyntaxKind.TypeAliasDeclaration](node: ts.Node) {
      const typeNode = node as ts.TypeAliasDeclaration;
      const isExported = !!typeNode.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const name = typeNode.name?.text || '';

      const decl = new DeclareVar({
        name,
        type: 'type',
        isExported,
        isTsType: true,
        astHash: getNodeNormalizedHash(typeNode, context.sourceFile),
        astNode: {
          symbol: typeNode.name,
          pendingNodes: [...(typeNode.typeParameters || []), typeNode.type],
        },
      });
      context.declareVars.push(decl);
      context.variableMap.set(name, decl);
    },
    // ========== 枚举声明处理 ==========
    [ts.SyntaxKind.EnumDeclaration](node: ts.Node) {
      const enumNode = node as ts.EnumDeclaration;
      const isExported = !!enumNode.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const name = enumNode.name?.text || '';

      const decl = new DeclareVar({
        name,
        type: 'enum',
        isExported,
        isTsType: true,
        astHash: getNodeNormalizedHash(enumNode, context.sourceFile),
        astNode: {
          symbol: enumNode.name,
          pendingNodes: [...(enumNode.members || [])],
        },
      });
      context.declareVars.push(decl);
      context.variableMap.set(name, decl);
    },
  }
}
export default createHandlers;
