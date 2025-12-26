// src/worker.ts
import { parentPort, workerData, isMainThread } from 'worker_threads'
import { asyncAnalyzeFile } from '../handlers/index.js'
import { writeFileContent } from '../files.js'
import { jsonToString } from '../helper.js'

if (isMainThread || !parentPort) {
  throw new Error('Not in worker thread')
}

const { compilerOptions, dependencies } = workerData;

parentPort.on('message', async (msg) => {
  if (msg.type === 'TASK') {

    const { filePath, outDir } = msg;

    const results = await asyncAnalyzeFile(filePath, compilerOptions, dependencies);
    
    console.log(`Analyzing file: ${outDir} ==>`);

    await writeFileContent(outDir, jsonToString(results));

    parentPort!.postMessage({ type: 'DONE' })
  }
})
