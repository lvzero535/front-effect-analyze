import path from "path";
import { getFileContent, traverseFiles } from "./files";
import { AnalyzeOptions } from "./analyze";
import { ProjectFilesOptions } from "./types";

 async function getTsconfigConfig(projectRoot:string, tsconfigFileName: string) {
    const tsconfigPath = path.join(projectRoot, tsconfigFileName);
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

export async function loadProjectFiles(projectRoot: string, options: ProjectFilesOptions = {}): Promise<AnalyzeOptions> {
  const {
    tsconfigFileName = "tsconfig.json",
    isTraverseFile = true,
    ...fileOps
   } = options;
  const tsconfigJson = await getTsconfigConfig(projectRoot, tsconfigFileName);

  const packageJson = await getPackageConfig(projectRoot);

  const files = isTraverseFile ? await traverseFiles(projectRoot, fileOps) : [];

  return { tsconfigJson, packageJson, files };
}
