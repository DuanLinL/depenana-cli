#!/usr/bin/env node

import { Command } from 'commander';
import { analyzePackageJSON, DependencyNode } from './analyzer';
import { generateAndOpenHTML } from './htmlGenerator';
import * as fs from 'fs/promises';
import path from 'path';

// 创建命令行工具实例
const program = new Command();

// 基本信息配置
program
  .name('depenana-cli')
  .version('1.0.0')
  .description('NPM Package 分析工具：帮助你深入了解项目的依赖结构，分析循环依赖和多版本实例')
  .option('--depth <n>', '限制向下递归分析的层次深度', parseInt)
  .option('--json [file-path]', '将依赖关系以 JSON 形式存储到指定文件')
  .parse(process.argv);

// 异步函数，执行分析操作
async function analyze() {
  const options = program.opts();
  const depth = options.depth !== undefined ? options.depth : Infinity;

  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJSONContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJSON = JSON.parse(packageJSONContent);
    const rootDependency = await analyzePackageJSON(process.cwd(), packageJSON, new Set<string>(), depth);

    if (options.json) {
      const filePath = options.json === true ? 'dependency_tree.json' : options.json;
      // 将依赖关系树写入 JSON 文件
      await writeFileAsync(filePath, JSON.stringify(rootDependency, null, 2));
      console.log(`Dependency graph has been saved to ${filePath}`);
    } else {
      // 生成 HTML 并打开网页
      await generateAndOpenHTML(process.cwd(), packageJsonPath, depth);
    }
  } catch (error) {
    console.error('An error occurred during analysis:', error);
  }
}

// 异步函数，用于将依赖内容写入文件
async function writeFileAsync(filePath: string, content: string): Promise<void> {
  console.log(`Writing to file: ${filePath}`);
  return new Promise<void>((resolve, reject) => {
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
}

// 异步函数，用于运行命令行工具
export async function run() {
  if (!process.argv.slice(2).length) {
    // 未输入命令，输出错误消息
    console.error('Invalid command. Use "depenana-cli --help" for usage information.');
  } else if (process.argv[2] === '--help') {
    // 输入了 depenana-cli --help，显示帮助信息
    program.help();
  } else if (process.argv[2] === 'analyze') {
    // 输入的命令是 analyze，则执行分析操作
    await analyze();
  } else {
    // 命令不合法，打印错误消息
    console.error('Invalid command. Use "depenana-cli --help" for usage information.'); 
  }
}

run(); // 运行命令行工具。