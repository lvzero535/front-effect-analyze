import { jsonToString } from '../helper';
import { writeFileContent } from '../files';

import { asyncAnalyzeFile } from '../handlers/index.js';



// testAnalyzeVueFile();
// testAnalyzeTsFile();
// testAnalyzeJsFile();

async function testAnalyzeJsxFile() {
  const jsxFile = "E:\\DevPrograms\\CodeRepository\\dev-products\\nest-vue-app\\nest-vue-web\\src\\components\\toolbar\\src\\types.ts";
  const result = await asyncAnalyzeFile(jsxFile, 'E:/DevPrograms/CodeRepository/dev-products/nest-vue-app/nest-vue-web');
  if (!result) {
    return;
  }
  const jsonFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/CheckCodeResult.json';
  writeFileContent(jsonFile, jsonToString(result));
}

testAnalyzeJsxFile();
