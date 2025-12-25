import ts from "typescript";

/**
 * 通用 AST 遍历器。
 * @param node 要遍历的节点
 * @param handlers 一个对象，键为 SyntaxKind 名称（例如 "ImportDeclaration"），值为处理函数
 *                 处理函数可以返回 `false` 来阻止对该节点子节点的继续遍历
 * @param parent 可选的父节点
 */
export function traverseNode(
  node: ts.Node,
  handlers: { [kindName: string]: (n: ts.Node, parent?: ts.Node) => boolean | void },
  parent?: ts.Node
) {
  const kindName = ts.SyntaxKind[node.kind];
  const handler = handlers && handlers[kindName];

  let shouldTraverseChildren = true;
  if (typeof handler === 'function') {
    try {
      const res = handler(node, parent);
      if (res === false) shouldTraverseChildren = false;
    } catch (e) {
      // handler 抛错不影响主遍历，记录到控制台以便调试
      // eslint-disable-next-line no-console
      console.error(`traverseNode handler error for ${kindName}:`, e);
    }
  }

  if (shouldTraverseChildren) {
    node.forEachChild(child => traverseNode(child, handlers, node));
  }
}