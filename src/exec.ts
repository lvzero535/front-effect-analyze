import { start } from "./index.js";

start({
  projectRoot: "E:/DevPrograms/CodeRepository/dev-products/nest-vue-app/nest-vue-web",
  modifiedFiles: [
    "E:\\DevPrograms\\CodeRepository\\dev-products\\nest-vue-app\\nest-vue-web\\src\\utils\\tree.ts",
    "E:\\DevPrograms\\CodeRepository\\dev-products\\nest-vue-app\\nest-vue-web\\src\\api\\role\\index.ts",
  ],
  fileOps: {
    includeExtensions: [".ts", ".vue"],
    excludeDirs: ["node_modules", ".git", 'dist', 'build', '.vscode'],
    tsconfigFileName: "tsconfig.app.json",
  },
  analyzeJsonFile: {
    fileName: "analyze.json",
  },
  resultJsonFile: {
    fileName: "result.json",
  },
  isFullAnalyze: false,
  enableWorker: true,
});