import path from "node:path";
import fs from "node:fs";

interface TsConfig {
  compilerOptions?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
}

const innerDeps = [
  'fs',
  'path',
  'http',
  'https',
  'url',
  'util',
  'events',
  'stream',
  'zlib',
  'crypto',
  'buffer',
  'querystring',
  'os',
  'child_process',
  'net',
  'tls',
  'dns',
  'readline',
  'string_decoder',
  'typescript',
  '@idux/compilerOptions',
]

/**
 * 
 * @param moduleSpecifier 模块指定符
 * @param tsconfig tsconfig 配置
 * @param currentFileDir 当前文件目录
 * @param installDeps 安装的依赖包
 * @returns 解析后的模块指定符
 */
export function resolveModuleSpecifier(
  moduleSpecifier: string,
  tsconfig: { baseUrl?: string; paths: Record<string, string[]> },
  currentFileDir: string,
  installDeps: string[]
): string {
  if (!moduleSpecifier) return moduleSpecifier;

  if ([...innerDeps, ...installDeps].includes(moduleSpecifier)) {
    return moduleSpecifier;
  }

  const resolvedPath = resolveModulePath(currentFileDir, moduleSpecifier, { compilerOptions: tsconfig });
  return resolvedPath;

}


/**
 * 根据 tsconfig paths + 相对路径 + 第三方库 判断 moduleSpecifier 的最终绝对路径
 */
export function resolveModulePath(
  currentFile: string,
  moduleSpecifier: string,
  tsconfig: TsConfig
): string {
  // const baseUrl = tsconfig.compilerOptions?.baseUrl || ".";
  const baseUrl = ".";
  const paths = tsconfig.compilerOptions?.paths || {};

  const projectRoot = findProjectRoot(currentFile);
  const baseUrlAbs = path.resolve(projectRoot, baseUrl);

  // -----------------------
  // 1. 第三方依赖 & node 内置的库
  // -----------------------
  if (isBareModule(moduleSpecifier, paths)) {
    return moduleSpecifier; // 保留原样
  }

  // -----------------------
  // 2. 相对路径：直接转绝对路径
  // -----------------------
  if (isRelative(moduleSpecifier)) {
    return tryResolvePath(path.resolve(currentFile, moduleSpecifier));
  }

  // -----------------------
  // 3. 尝试 paths 匹配
  // -----------------------
  const matchedKey = findBestPathsKey(moduleSpecifier, paths);
  if (!matchedKey) {
    // bare import 但没有 paths：保持原样
    return moduleSpecifier;
  }

  const targetPatterns = paths[matchedKey];
  const wildcardValue = extractWildcardValue(matchedKey, moduleSpecifier);

  const targetPattern = targetPatterns[0];
  const replaced = targetPattern.replace("*", wildcardValue);
  const resolved = path.resolve(baseUrlAbs, replaced);
  return tryResolvePath(resolved);
}

/**
 * Try to resolve a path that may be a directory or missing extension.
 * Returns the first existing file candidate or the original path if none found.
 */
function tryResolvePath(p: string): string {
  try {
    // if exact file exists, return it
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;

    // if it's a directory, look for index files
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      const indexCandidates = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.d.ts', 'index.vue'];
      for (const idx of indexCandidates) {
        const ip = path.join(p, idx);
        if (fs.existsSync(ip) && fs.statSync(ip).isFile()) return ip;
      }
    }

    // try adding common extensions
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
    for (const ext of exts) {
      const fp = p + ext;
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
    }
  } catch (e) {
    // ignore filesystem errors and fall through
  }

  // fallback: return original path
  return p;
}

/** 判断是否相对路径（./ ../ /） */
function isRelative(spec: string): boolean {
  return spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/");
}

/** 判断是否第三方依赖或 node 内置模块（排除 tsconfig paths alias） */
function isBareModule(spec: string, paths: Record<string, string[]>): boolean {
  if (spec.startsWith("node:")) return true;

  // 相对路径不是第三方模块
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
    return false;
  }

  // 如果匹配到 paths 别名前缀 → 不是第三方模块
  for (const key of Object.keys(paths)) {
    const prefix = key.replace("/*", "");
    if (spec === prefix || spec.startsWith(prefix + "/")) {
      return false;
    }
  }

  // 否则第三方模块
  return true;
}


/** 找项目根目录（含 tsconfig.json 的地方） */
function findProjectRoot(filePath: string): string {
  let dir = filePath;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "tsconfig.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/** paths longest prefix 匹配 */
function findBestPathsKey(
  moduleSpecifier: string,
  paths: Record<string, string[]>
): string | null {
  let bestKey: string | null = null;

  for (const key of Object.keys(paths)) {
    const cleanKey = key.replace("/*", "");
    if (
      moduleSpecifier === cleanKey ||
      moduleSpecifier.startsWith(cleanKey + "/")
    ) {
      if (!bestKey || cleanKey.length > bestKey.length) {
        bestKey = key;
      }
    }
  }

  return bestKey;
}

/** 提取 * 对应的路径部分 */
function extractWildcardValue(key: string, moduleSpecifier: string): string {
  const keyPrefix = key.replace("/*", "");
  if (!key.includes("*")) return "";
  return moduleSpecifier.slice(keyPrefix.length);
}
