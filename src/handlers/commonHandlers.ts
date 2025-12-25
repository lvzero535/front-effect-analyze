import ts from 'typescript';

export interface TraverseContext {
  imports: Array<{ local: string; imported?: string; moduleSpecifier: string }>;
  exports: Array<{ name: string }>;
  declarations: Array<{ name: string; kind: string }>;
  identifiers: Array<{ name: string; parentKind?: string }>;
}

/**
 * 创建一组常用的 AST 节点处理器，用于配合 `traverseNode` 使用。
 * handlers 的键为 `ts.SyntaxKind[node.kind]` 的名称。
 *
 * 示例用法:
 * const ctx = { imports: [], exports: [], declarations: [], identifiers: [] };
 * const handlers = createCommonHandlers(ctx, sourceFile);
 * traverseNode(sourceFile, handlers);
 */
export function createCommonHandlers(ctx: TraverseContext, sourceFile?: ts.SourceFile) {
  return {
    ImportDeclaration(node: ts.Node) {
      const n = node as ts.ImportDeclaration;
      const spec = n.moduleSpecifier?.getText(sourceFile)?.replace(/^['"`]|['"`]$/g, '') || '';
      const clause = n.importClause;
      if (!clause) return;
      if (clause.name) {
        ctx.imports.push({ local: clause.name.text, imported: 'default', moduleSpecifier: spec });
      }
      if (clause.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          ctx.imports.push({ local: clause.namedBindings.name.text, imported: '*', moduleSpecifier: spec });
        } else if (ts.isNamedImports(clause.namedBindings)) {
          clause.namedBindings.elements.forEach(el => {
            const imported = el.propertyName?.text || el.name.text;
            const local = el.name.text;
            ctx.imports.push({ local, imported, moduleSpecifier: spec });
          });
        }
      }
    },

    ExportDeclaration(node: ts.Node) {
      const n = node as ts.ExportDeclaration;
      if (n.exportClause && ts.isNamedExports(n.exportClause)) {
        n.exportClause.elements.forEach(el => {
          const name = el.name.text;
          ctx.exports.push({ name });
        });
      } else if (n.moduleSpecifier) {
        // export * from 'x' — register as export without local name
        const spec = n.moduleSpecifier.getText(sourceFile).replace(/^['"`]|['"`]$/g, '');
        ctx.imports.push({ local: '*exported*', imported: '*', moduleSpecifier: spec });
      }
    },

    VariableStatement(node: ts.Node) {
      const n = node as ts.VariableStatement;
      n.declarationList.declarations.forEach(d => {
        if (ts.isIdentifier(d.name)) {
          ctx.declarations.push({ name: d.name.text, kind: (n.declarationList.flags & ts.NodeFlags.Const) ? 'const' : 'var' });
        }
      });
    },

    FunctionDeclaration(node: ts.Node) {
      const n = node as ts.FunctionDeclaration;
      if (n.name && ts.isIdentifier(n.name)) {
        ctx.declarations.push({ name: n.name.text, kind: 'function' });
      }
    },

    ClassDeclaration(node: ts.Node) {
      const n = node as ts.ClassDeclaration;
      if (n.name && ts.isIdentifier(n.name)) {
        ctx.declarations.push({ name: n.name.text, kind: 'class' });
      }
    },

    Identifier(node: ts.Node, parent?: ts.Node) {
      const id = node as ts.Identifier;
      ctx.identifiers.push({ name: id.text, parentKind: parent ? ts.SyntaxKind[parent.kind] : undefined });
    }
  } as { [kindName: string]: (n: ts.Node, parent?: ts.Node) => boolean | void };
}

export default createCommonHandlers;
