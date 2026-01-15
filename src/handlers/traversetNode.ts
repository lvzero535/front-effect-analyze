import ts from "typescript";
import { Handlers } from "./types";

/**
 * 通用 AST 遍历器（递归深度优先遍历）
 * 
 * @param node 要遍历的节点
 * @param handlers 一个对象，键为 SyntaxKind 名称（例如 "ImportDeclaration"），值为处理函数
 *                 处理函数可以返回 `false` 来阻止对该节点子节点的继续遍历
 * @param parent 可选的父节点
 * 
 * @example
 * ```typescript
 * const handlers = {
 *   ImportDeclaration: (node, parent) => {
 *     console.log('Found import');
 *     return false; // 不遍历子节点
 *   },
 *   FunctionDeclaration: (node, parent) => {
 *     // 继续遍历子节点（默认） 
 *   }
 * };
 * traverseNode(sourceFile, handlers);
 * ```
 */
export function traverseNode(
  node: ts.Node,
  handlers: Handlers,
  parent?: ts.Node,
  isShouldTraverseChildren = true
) {
  const handler = handlers?.[node.kind];

  let shouldTraverseChildren = isShouldTraverseChildren;
  
  if (typeof handler === 'function') {
    try {
      const res = handler(node, parent);
      // 返回 false 表示阻止遍历子节点
      if (isShouldTraverseChildren && res === false) shouldTraverseChildren = false;
    } catch (e) {
      // handler 抛错不影响主遍历，记录到控制台以便调试
      // eslint-disable-next-line no-console
      console.error(`traverseNode handler error for ${ts.SyntaxKind[node.kind]}:`, e);
    }
  }

  if (shouldTraverseChildren || ts.isSourceFile(node)) {
    node.forEachChild(child => traverseNode(child, handlers, node, isShouldTraverseChildren));
  }
}