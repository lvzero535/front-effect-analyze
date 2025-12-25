import * as ts from 'typescript';
import * as crypto from 'crypto';

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
