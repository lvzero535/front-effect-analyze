import { jsonToString } from '@/helper';
import { analyzeTsFile } from '../handlers/handleTs';
import { handleVue } from '../handlers/handleVue';
import { writeFileContent } from '@/files';

async function testAnalyzeTsFile() {

const tsFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/TSCode.ts';
  const result = await analyzeTsFile(tsFile, { baseUrl: 'vue-web', paths: {
    "@/*": ["src/*"],
    "@app/*": ["src/app/*"],
    "@lib/utils/*": ["src/shared/utils/*"]
  } });
  const jsonFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/TSCodeResult.json';
  writeFileContent(jsonFile, jsonToString(result));

}

async function testAnalyzeVueFile() {

// const tsFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/TSCode.ts';
  const vueFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/VueCode.vue';
  const result = await handleVue(vueFile, { baseUrl: 'vue-web', paths: {
    "@/*": ["src/*"],
    "@app/*": ["src/app/*"],
    "@lib/utils/*": ["src/shared/utils/*"]
  } });
  const jsonFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/VueCodeResult.json';
  writeFileContent(jsonFile, jsonToString(result));

}

async function testAnalyzeJsFile() {

const jsFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/JSCode.js';
  const result = await analyzeTsFile(jsFile, { baseUrl: 'vue-web', paths: {
    "@/*": ["src/*"],
    "@app/*": ["src/app/*"],
    "@lib/utils/*": ["src/shared/utils/*"]
  } });
  const jsonFile = 'E:/DevPrograms/CodeRepository/dev-products/project-modify-effect/src/test/JSCodeResult.json';
  writeFileContent(jsonFile, jsonToString(result));

}

// testAnalyzeVueFile();
// testAnalyzeTsFile();
testAnalyzeJsFile();
