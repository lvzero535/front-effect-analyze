// src/main.ts
import { Worker } from 'worker_threads'
import os from 'os'
import fs from 'fs'
import path from 'path'
import type { FileAnalyzeResult } from '../handlers/types.js'
import type { ICompilerOptions, Result } from "../types.js";

const TMP_DIR = path.resolve('./tmp')
let activeWorkers = 0;
let fileCount = 0;

function reset() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true });
  }
  fs.mkdirSync(TMP_DIR);
  activeWorkers = 0;
  fileCount = 0;
}

function createWorker(files: string[], compilerOptions: ICompilerOptions, dependencies: string[], resolve: (value: Result) => void) {
  const worker = new Worker(
      new URL('./worker.js', import.meta.url),
      {
        workerData: {
          compilerOptions,
          dependencies,
        }
      });

  activeWorkers++

  worker.on('message', (msg) => {
    if (msg.type === 'DONE') {
      dispatch(worker, files)
    }
  })

  worker.on('exit', () => {
    activeWorkers--
    if (activeWorkers === 0) {
      console.log('✅ All workers finished')
      mergeResults(resolve)
    }
  })

  dispatch(worker, files)
}

function dispatch(worker: Worker, files: string[]) {
  const file = files[fileCount++]

  if (!file) {
    worker.terminate()
    return
  }

  worker.postMessage({
    type: 'TASK',
    filePath: file,
    outDir: path.join(TMP_DIR, `result-${fileCount}.json`)
  })
}

function mergeResults(resolve: (value: Result) => void) {
  const files = fs.readdirSync(TMP_DIR)

  let str = '[\n';

  let first = true;

  for (const file of files) {
    const content = fs.readFileSync(path.join(TMP_DIR, file), 'utf-8');
    if (!first) {
      str += ',\n';
    }
    str += content;
    first = false;
  }

  str += '\n]';
  const results = JSON.parse(str) as FileAnalyzeResult[];
  resolve(new Map(results.map((item) => [item.path, item])))
}

export async function workerAnalyzeFile(allFiles: string[], compilerOptions: ICompilerOptions, dependencies: string[]): Promise<Result> {
  const CPU_COUNT = os.cpus().length;
  let WORKER_COUNT = Math.max(1, Math.floor(CPU_COUNT / 2));

  if (WORKER_COUNT > allFiles.length) {
    WORKER_COUNT = allFiles.length;
  }

  reset();

  console.log(`🚀 Using ${WORKER_COUNT} workers`);
  // 启动 worker 池
  
  return new Promise((resolve) => {
    for (let i = 0; i < WORKER_COUNT; i++) {
      createWorker(allFiles, compilerOptions, dependencies, resolve);
    }
  });
}
