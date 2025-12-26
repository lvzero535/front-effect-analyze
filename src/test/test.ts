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

function findAllParentModules(jsonArr: any[], item: any) {
  const map = new Map();
  for (const node of jsonArr) map.set(node.path, node);

  const results = [] as string[][];

  function dfs(name: string, path: string[]) {
    const node = map.get(name);
    const parents = node?.parentModules || [];

    // If no parents, record current path as a terminal path
    if (!parents || parents.length === 0) {
      results.push(path);
      return;
    }

    let extended = false;
    for (const p of parents) {
      if (path.includes(p)) {
        // cycle detected, skip this branch
        continue;
      }
      extended = true;
      dfs(p, [...path, p]);
    }

    // If parents exist but all branches are cycles or skipped,
    // treat current path as terminal (optional - here we skip)
    if (!extended) {
      // nothing to do (we avoid adding cyclic terminals)
    }
  }

  dfs(item.path, [item.path]);

  return {
    name: item.path,
    effectPaths: results.map(paths => ({ name: paths[paths.length - 1], paths })),
  };
}
console.log('jsonArr')
const result = findAllParentModules(jsonArr, {
    path: 'a',
    parentModules: ['b', 'c'],
})

console.log(JSON.stringify(result, null, 2))
/**

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



async function test(id: string) {
  return id;
}

async function test1(ids: string[]) {
  const results: string[] = [];
  for (const id of ids) {
    results.push(await test(id));
  }
  return results;
}

async function test2(ids: string[]) {
  const results = await Promise.all(ids.map((id) => test(id)));
  return results;
}
