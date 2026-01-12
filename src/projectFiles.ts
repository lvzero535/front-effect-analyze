import path from "path";
import { getFileContent, traverseFiles } from "./files.js";
import { ProjectFilesOptions } from "./types";

 async function getTsconfigConfig(tsconfigPath: string) {
    const tsconfigContent = await getFileContent(tsconfigPath);
    const tsconfig = JSON.parse(tsconfigContent);
    return tsconfig;
  }

async function getPackageConfig(projectRoot: string) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJsonContent = await getFileContent(packageJsonPath);
  const packageJson = JSON.parse(packageJsonContent);
  return packageJson;
}

export async function loadProjectFiles(projectRoot: string, options: ProjectFilesOptions = {}) {
  const {
    tsconfigFileName = "tsconfig.json",
    isTraverseFile = true,
    ...fileOps
   } = options;
  const tsconfigPath = path.resolve(projectRoot, tsconfigFileName);
  const tsconfigJson = await getTsconfigConfig(tsconfigPath);

  const packageJson = await getPackageConfig(projectRoot);

  const files = isTraverseFile ? await traverseFiles(projectRoot, fileOps) : [];
  return { tsconfigJson, packageJson, files, tsconfigPath };
}
