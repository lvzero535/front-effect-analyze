import type { IDeclareVar, VarType } from './types.js';

export class DeclareVar implements IDeclareVar {
  name: string;
  type: VarType;
  isExported: boolean;
  isImported: boolean;
  isTsType: boolean;
  astHash?: string;
  moduleSpecifier?: string;
  dependencies: IDeclareVar[] = [];

  constructor(options: {
    name: string;
    type: VarType;
    isExported?: boolean;
    isImported?: boolean;
    isTsType?: boolean;
    astHash?: string;
    moduleSpecifier?: string;
  }) {
    this.name = options.name;
    this.type = options.type;
    this.isExported = options.isExported ?? false;
    this.isImported = options.isImported ?? false;
    this.isTsType = options.isTsType ?? false;
    this.astHash = options.astHash;
    this.moduleSpecifier = options.moduleSpecifier;
  }

  /**
   * 添加依赖变量
   */
  addDependency(dep: IDeclareVar): void {
    if (!this.dependencies.some(d => d.name === dep.name)) {
      this.dependencies.push(dep);
    }
  }

  /**
   * 转换为普通对象
   */
  toObject(): IDeclareVar {
    return {
      name: this.name,
      type: this.type,
      isExported: this.isExported,
      isImported: this.isImported,
      isTsType: this.isTsType,
      astHash: this.astHash,
      moduleSpecifier: this.moduleSpecifier,
      dependencies: this.dependencies,
    };
  }
}