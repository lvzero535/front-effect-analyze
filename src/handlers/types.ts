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
   * 变量的ast hash值，用于前后后比较是否发生变化
   */
  astHash?: string;

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

  notExist?: boolean;

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
   * 文件中声明的顶层变量
   */
  declareVars: IDeclareVar[];

  /**
   * 哪个文件引用了当前文件
   */
  parentModules: string[];
}