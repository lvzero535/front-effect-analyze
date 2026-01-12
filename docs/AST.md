# AST 分析

## SourceFile下的statements

### VariableStatement

变更声明语句

#### VariableDeclaration

变量声明

1. `Identifier` 标识符号 变量名，只有这个节点才能通过 `checker.getSymbolAtLocation` 方法获取到符号信息。
2. `initializer` 初始化表达式 变量初始值，可能是
   - FunctionExpression 函数表达式
   - ArrowFunction 箭头函数表达式
