/**
 * 文件遍历工具函数
 *
 * @param dirPath 要遍历的目录路径
 * @param options 配置选项
 * @param options.excludeExtensions 要排除的文件扩展名数组，如 ['.tmp', '.log']
 * @param options.excludeDirs 要排除的目录名数组，如 ['node_modules', '.git']
 * @returns 返回匹配的文件路径数组
 *
 * @example
 * // 基本用法
 * const files = await traverseFiles('./src');
 *
 * // 带排除选项的用法
 * const files = await traverseFiles('./src', {
 *   excludeExtensions: ['.tmp'],
 *   excludeDirs: ['node_modules']
 * });
 */
import { promises as fs, existsSync } from "fs";
import path from "path";
import { TraverseOptions } from "./types.js";

export async function traverseFiles(
  dirPath: string,
  options: TraverseOptions = {},
): Promise<string[]> {
  const { excludeExtensions = [], includeExtensions = [], excludeDirs = [] } = options;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        files.push(...(await traverseFiles(fullPath, options)));
      }
    } else if (includeExtensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 获取指定文件的内容
 * 
 * @param filePath 要读取的文件路径
 * @returns 返回文件的内容，如果读取失败则抛出错误
 * 
 * @example
 * // 基本用法
 * const content = await getFileContent('path/to/your/file.txt');
 */
export async function getFileContent(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`读取文件 ${filePath} 时出错:`, error);
    throw error;
  }
}

export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`写入文件 ${filePath} 时出错:`, error);
    throw error;
  }
}

export function isFileExist(filePath: string): boolean {
  return existsSync(filePath);
}

export function getPath(paths: string[]): string {
  return path.resolve(...paths);
}