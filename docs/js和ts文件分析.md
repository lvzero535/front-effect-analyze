# 分析ts文件

分析ts文件的过程中，所有声明结构为：IDeclareVar。文件分析结果结构为FileAnalyzeResult。

```typescript
export type VarType = 'function' | 'class' | 'const' | 'let' | 'var' | 'interface' | 'type' | 'enum';

/**
 * 文件或函数中声明变量的分析结构
 * isExported和isImported会同时为true，当变量是从另一个模块导入并重新导出时
 */
export interface IDeclareVar {
  /**
   * 声明的变量名
   */
  name: string;

  /**
   * 变量的类型, 如 function, class, const 等
   */
  type: VarType;

  /**
   * 是否导出
   */
  isExported: boolean;

  /**
   * 是否是导入的变量
   */
  isImported: boolean;

  /**
   * 是否为TS类型声明，如 interface, type 等
   */
  isTsType: boolean;

  /**
   * 如果isImported为true，则为导入路径
   * 如：import { TabsModule } from '@/store/modules/tabs';
   * 则 moduleSpecifier 为 'E:/DevPrograms/CodeRepository/dev-products/nest-vue-app/nest-vue-web/src/store/modules/tabs'
   * 如：import { TabsModule } from 'vuex-module-decorators';
   * 则 moduleSpecifier 为 'vuex-module-decorators'
   */
  moduleSpecifier?: string;

  /**
   * 这个变量所依赖的其他变量，如函数调用中使用的变量，对象属性引用了其他变量等
   */
  dependencies: IDeclareVar[];
}

/**
 * 文件分析结果
 */
export interface FileAnalyzeResult {
  /**
   * 当前文件路径
   */
  path: string;

  /**
   * 文件类型
   */
  fileType: 'ts' | 'js' | 'vue';

  /**
   * 文件依赖的其他文件路径
   */
  moduleSpecifiers: Array<string>;

  /**
   * 文件中声明的变量
   */
  declareVars: IDeclareVar[];
}

```

## 分析Statements

分析Statements，提取所有的变量声明，存在一个定好的结构中，结构为上面定义的IDeclareVar。添加到FileAnalyzeResult的declareVars中。
如果变量声明或函数依赖了其他了isExported或isImported为true的变量，将其添加到IDeclareVar的dependencies中。

请帮我修改analyzeTsFile

1. 分析sourceFile节点所有直接子节点（FirstLevelNodes），存在的IDeclareVar添加到declareVars中，这里要计算astHash。
2. 分析每个FirstLevelNodes下面的子节点，是否引用了其他FirstLevelNodes中的IDeclareVar，将当前FirstLevelNodes节点中IDeclareVar的dependencies中。
3. FirstLevelNodes下面的子节点都不存在到declareVars中，这里只为了找到FirstLevelNodes下面的子节点是否引用了其他FirstLevelNodes中的变量。