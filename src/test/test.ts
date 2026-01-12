import ts from 'typescript';
import { ProgramBuilder } from './ProgramBuilder.ts';
import { printAstTree } from '../handlers/helper.ts';

function findTopLevelVariableSymbol(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  name: string
): ts.Symbol | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === name
        ) {
          return checker.getSymbolAtLocation(decl.name);
        }
      }
    }
  }
}


export function isSameOuterVariable(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  functionNode: ts.FunctionLikeDeclaration,
  outerVarName: string
): boolean {
  // 1. 找到外部变量声明的 symbol
  const outerSymbol = findTopLevelVariableSymbol(
    sourceFile,
    checker,
    outerVarName
  );

  if (!outerSymbol) return false;

  let isSame = false;

  // 2. 遍历函数体，找 Identifier
  function visit(node: ts.Node) {
    if (isSame) return;

    if (ts.isIdentifier(node) && node.text === outerVarName) {
      const symbol = checker.getSymbolAtLocation(node);

      if (symbol && symbol === outerSymbol) {
        isSame = true;
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  if (functionNode.body) {
    visit(functionNode.body);
  }

  return isSame;
}


(async () => {
  const builder = new ProgramBuilder();

  // worker 启动时创建 Program（一次）
  const programBuilder = await builder.getProgram('e:/DevPrograms/CodeRepository/dev-products/nest-vue-app/nest-vue-web/tsconfig.app.json');
  const { program, checker } = programBuilder;

  const sourceFile = program.getSourceFile('E:/DevPrograms/CodeRepository/dev-products/nest-vue-app/nest-vue-web/src/utils/num.ts');

  if (sourceFile) {
    // printAstTree(sourceFile, sourceFile);
    if (sourceFile) {
    for (const stmt of sourceFile.statements) {
      if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === 'add') {
        const result = isSameOuterVariable(
          sourceFile,
          checker,
          stmt,
          'counts'
        );

        console.log('add() 内的 count 是否引用外部 count：', result);
      }
    }
  }

  }
  const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
  // console.log(diagnostics);
  // console.log(programBuilder);
})();

// 帮我编写一个函数,遍历AST树, 判断函数内的count是否和外面的count是同一个变量
