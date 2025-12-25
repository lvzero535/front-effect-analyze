import {Analyze} from "./analyze";
const projectRoot = "E:/DevPrograms/CodeRepository/dev-products/nest-vue-app/nest-vue-web";
function genConfig() {
  return {
    baseUrl: 'vue-web',
    paths: {
      "@/*": ["src/*"],
      "@app/*": ["src/app/*"],
      "@lib/utils/*": ["src/shared/utils/*"]
    }
  }
}
function start() {
  new Analyze(projectRoot);
}
start();
