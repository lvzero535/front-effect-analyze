import type { FileAnalyzeResult, IDeclareVar } from "./handlers/types.js";
import { getCommonElements } from "./helper.js";
import type { EffectResult, Result } from "./types.js";

type DiffType = 'add' | 'change' | 'remove';
type DiffDeclareVar = IDeclareVar & { diffType: DiffType };

/**
 * 
 * 1. 新增的依赖变量
 * 2. 变化的依赖变量（astHash不同）
 * 3. 移除的依赖变量（在newFile.declareVars中不存在）
 * 4. name一样时，根据astHash判断是否变化
 * 
 * 查找新增或变化的依赖变量
 * @param oldDependencies 旧的依赖变量列表
 * @param newDependencies 新的依赖变量列表
 * @returns 新增或变化的依赖变量列表
 */
function findDiffDependencies(
  oldFile: FileAnalyzeResult,
  newFile: FileAnalyzeResult,
): DiffDeclareVar[] {
  const oldVars = oldFile?.declareVars || [];
  const newVars = newFile?.declareVars || [];

  const keyOf = (v: IDeclareVar) => v.name;

  const oldMap = new Map<string, IDeclareVar>();
  for (const v of oldVars) oldMap.set(keyOf(v), v);

  const newMap = new Map<string, IDeclareVar>();
  for (const v of newVars) newMap.set(keyOf(v), v);

  const diffs: DiffDeclareVar[] = [];

  // added or changed (compare by astHash)
  for (const [name, nv] of newMap) {
    const ov = oldMap.get(name);
    if (!ov) {
      diffs.push({ ...nv, diffType: 'add' });
    } else if (nv.astHash !== ov.astHash) {
      diffs.push({ ...nv, diffType: 'change' });
    }
  }

  // removed
  for (const [name, ov] of oldMap) {
    if (!newMap.has(name)) {
      diffs.push({ ...ov, diffType: 'remove' });
    }
  }

  return diffs;
}

/**
 * 对比两个分析结果，查找新增或变化的文件依赖
 * @param oldAnalyzeJson 旧的分析结果
 * @param newAnalyzeJson 新的分析结果
 * @returns 新增或变化的文件依赖映射
 */
export function diffAnalyzeJson(
  oldAnalyzeJson: Result,
  newAnalyzeJson: Result,
) {
  const dependencies: Map<string, EffectResult> = new Map();
  for (const [file, newInfo] of newAnalyzeJson) {


    // 文件不存在了
    if (newInfo.notExist) {
      oldAnalyzeJson.delete(file);
    } else {

      let oldInfo = oldAnalyzeJson.get(file);

      // 新增文件
      if (!oldInfo) {
        oldInfo = newInfo;
      }
      const diffs = findDiffDependencies(oldInfo, newInfo);
      const ret = findModifiedDependenciesFiles(oldAnalyzeJson, newInfo, diffs);
      dependencies.set(file, ret);

      oldAnalyzeJson.set(file, newInfo);
    }
  }
  return {
    analyzeJson: oldAnalyzeJson, // 旧的分析结果，包含新增或变化的文件, 重新保存
    result: dependencies, // 受影响的依赖文件映射，key 为受影响的文件路径，value 为受影响的依赖文件路径列表
  };
}


/**
 * 查找当前文件受影响的依赖文件
 * @param oldAnalyzeJson 旧的分析结果
 * @param newAnalyzeJson 当前文件的分析结果
 * @param diff 当前文件的变化记录
 * @returns 受影响的依赖文件路径列表
 */
function findModifiedDependenciesFiles(
  oldAnalyzeJson: Result,
  newAnalyzeJson: FileAnalyzeResult,
  diff: DiffDeclareVar[],
): EffectResult {

  // 当前文件导出的已修改过的变量
  const exportNames = diff.filter(v => v.isExported).map(v => v.name);

  const results: string[][] = [];

  function dfs(path: string, paths: string[], effectNames: string[]) {
    const item = oldAnalyzeJson.get(path);

    const parents = item?.parentModules || []
  
    // 没有父文件了
    if (!parents || parents.length === 0) {
      results.push(paths);
      return;
    };

    // vue 文件，只考虑直接引入的变量
    // TODO: 考虑其他文件类型
    const isVue = path.endsWith('.vue');

    let extended = false;
    for (const parent of parents) {

      // 避免循环引用
      if (paths.includes(parent)) continue;

      const parentItem = oldAnalyzeJson.get(parent);

      // 父文件不存在了
      if (!parentItem) continue;
      let exportNamesInParent: string[] = [];

      // vue文件当成一个整体处理, 不考虑引入的变量
      if (!isVue) {
        // 父文件导入的变量
        const importedNames = parentItem.declareVars.filter(it => it.isImported).map(it => it.name);

        // 是否引入了修改过的变量
        const commonNames = getCommonElements(importedNames, effectNames);
        if (commonNames.length === 0) continue;

        // 找出父文件导出的受影响过的变量
        exportNamesInParent = parentItem.declareVars
        .filter(it => it.isExported)
        .filter(it => it.dependencies.some(d => commonNames.includes(d.name)))
        .map(it => it.name);
      }
      
      extended = true;

      dfs(parent, [...paths, parent], exportNamesInParent);
    }

    // 没有引入过修改过的变量，但是父文件导出了修改过的变量
    if (!extended) {
      // results.push(paths);
    }

  } 

  dfs(newAnalyzeJson.path, [newAnalyzeJson.path], exportNames);

  return {
    path: newAnalyzeJson.path,
    effectPaths: results.map(paths => ({ name: paths[paths.length - 1], paths })),
  };
}

/**

const jsonArr = [
  {
    path: 'a',
    parentModules: ['b', 'c'],
  },
  {
    path: 'b',
    parentModules: ['c', 'd'],
  },
  {
    path: 'c',
    parentModules: ['a', 'e', 'f', 'd'],
  },
  {
    path: 'd',
    parentModules: ['a', 'e', 'f'],
  },
];


{
  name: 'a',
  effectPaths: [
    { name: 'a', paths: ['a', 'b', 'c', 'a'] }, // 不要这个，因为 a 循环了
    { name: 'e', paths: ['a', 'b', 'c', 'e'] },
    { name: 'f', paths: ['a', 'b', 'c', 'f'] },
    { name: 'd', paths: ['a', 'b', 'd'] },
    { name: 'a', paths: ['a', 'c', 'a'] },  // 不要这个，因为 a 循环了
    { name: 'e', paths: ['a', 'c', 'e'] },
    { name: 'f', paths: ['a', 'c', 'f'] },
  ]
}


 */

