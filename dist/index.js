#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const commander_1 = require("commander");
const analyzer_1 = require("./analyzer");
const htmlGenerator_1 = require("./htmlGenerator");
const fs = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// 创建命令行工具实例
const program = new commander_1.Command();
// 基本信息配置
program
    .name('depenana-cli')
    .version('1.0.0')
    .description('NPM Package 分析工具：帮助你深入了解项目的依赖结构，分析循环依赖和多版本实例')
    .option('--depth <n>', '限制向下递归分析的层次深度', parseInt)
    .option('--json [file-path]', '将依赖关系以 JSON 形式存储到指定文件')
    .parse(process.argv);
// 异步函数，执行分析操作
function analyze() {
    return __awaiter(this, void 0, void 0, function* () {
        const options = program.opts();
        const depth = options.depth !== undefined ? options.depth : Infinity;
        try {
            const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
            const packageJSONContent = yield fs.readFile(packageJsonPath, 'utf8');
            const packageJSON = JSON.parse(packageJSONContent);
            const rootDependency = yield (0, analyzer_1.analyzePackageJSON)(process.cwd(), packageJSON, new Set(), depth);
            if (options.json) {
                const filePath = options.json === true ? 'dependency_tree.json' : options.json;
                // 将依赖关系树写入 JSON 文件
                yield writeFileAsync(filePath, JSON.stringify(rootDependency, null, 2));
                console.log(`Dependency graph has been saved to ${filePath}`);
            }
            else {
                // 生成 HTML 并打开网页
                yield (0, htmlGenerator_1.generateAndOpenHTML)(process.cwd(), packageJsonPath, depth);
            }
        }
        catch (error) {
            console.error('An error occurred during analysis:', error);
        }
    });
}
// 异步函数，用于将依赖内容写入文件
function writeFileAsync(filePath, content) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Writing to file: ${filePath}`);
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, 'utf8')
                .then(() => {
                console.log('Write operation successful');
                resolve();
            })
                .catch(error => {
                console.error('Write operation failed:', error);
                reject(error);
            });
        });
    });
}
// 异步函数，用于运行命令行工具
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.argv.slice(2).length) {
            // 未输入命令，输出错误消息
            console.error('Invalid command. Use "depenana-cli --help" for usage information.');
        }
        else if (process.argv[2] === '--help') {
            // 输入了 depenana-cli --help，显示帮助信息
            program.help();
        }
        else if (process.argv[2] === 'analyze') {
            // 输入的命令是 analyze，则执行分析操作
            yield analyze();
        }
        else {
            // 命令不合法，打印错误消息
            console.error('Invalid command. Use "depenana-cli --help" for usage information.');
        }
    });
}
exports.run = run;
run(); // 运行命令行工具。
