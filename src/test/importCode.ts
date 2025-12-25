import { Analyze } from "./analyze";
import { getFileContent } from "../files";
import { analyzeTsFile } from "../handlers/handleTs";
import path from "path";
import * as ts from "typescript";
import type { FileAnalyzeResult } from "../types";
import func, { arrowFunc } from "./TSCodeFunc";
import { func as func2, arrowFunc as arrowFunc2 } from "@/analyze/test/TSCodeFunc";
import { func3 } from "@app/analyze/test/TSCodeFunc";
import { func2 } from "@lib/utils/analyze/test";
import { form } from "@idux/compilerOptions";

// const projectRoot = "E:/DevPrograms/";
// function start() {
// 	new Analyze(projectRoot);
// }
// start();
