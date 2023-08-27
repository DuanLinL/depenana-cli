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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndOpenHTML = void 0;
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const analyzer_1 = require("./analyzer");
const dependencyAnalyzer_1 = require("./dependencyAnalyzer");
//生成并打开 HTML 页面
function generateAndOpenHTML(projectRoot, packageJsonPath, depth) {
    return __awaiter(this, void 0, void 0, function* () {
        const visitedPackages = new Set();
        const packageJSONContent = yield fs.promises.readFile(packageJsonPath, 'utf8');
        const packageJSON = JSON.parse(packageJSONContent);
        const rootNode = yield (0, analyzer_1.analyzePackageJSON)(projectRoot, packageJSON, visitedPackages, depth);
        const packageVersions = (0, dependencyAnalyzer_1.detectMultipleVersions)(rootNode);
        const circularPaths = (0, dependencyAnalyzer_1.detectCircularDependencies)(rootNode);
        const analysisContent = generateAnalysisContent(packageVersions, circularPaths);
        const scriptContent = generateScriptContent(rootNode);
        // 生成完整的 HTML 内容
        const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dependency Graph</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js"></script>
    </head>
    <body>
      <div id="dependencyGraph" style="width: 100%; height: 600px;"></div>
      <div id="analysisContent">
        ${analysisContent} <!-- 插入分析内容 -->
      </div>
      <script>
        ${scriptContent} <!-- 插入图表的JavaScript代码 -->
      </script>
    </body>
    </html>
  `;
        const filePath = 'dependency_graph.html';
        fs.writeFileSync(filePath, htmlContent, 'utf8');
        // 打开 HTML 文件
        const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        (0, child_process_1.exec)(`${openCommand} ${filePath}`, (error) => {
            if (error) {
                console.error('Error occurred while opening the HTML page:', error);
            }
            else {
                console.log(`Generated HTML page: ${filePath}`);
            }
        });
    });
}
exports.generateAndOpenHTML = generateAndOpenHTML;
// 生成 JavaScript 脚本内容
function generateScriptContent(rootNode) {
    const data = generateEChartsData(rootNode);
    return `
    document.addEventListener('DOMContentLoaded', () => {
      const myChart = echarts.init(document.getElementById('dependencyGraph'));
      const data = ${data};
      const option = {
        title: {
          text: 'Dependency Graph',
          top: 'top',
          left: 'center',
        },
        series: [
          {
            type: 'graph',
            layout: 'none',
            draggable: true,
            data: data.nodes,
            links: data.links,
            edgeSymbol: ['circle', 'arrow'],
            edgeSymbolSize: [2, 8],
            animationDuration: 3000,
            lineStyle: {
              color: 'black',
              curveness: 0.2,
              autoCurveness: true,
            },
            itemStyle: {
              color: 'white',
              borderColor: 'black',
            },
            label: {
              show: true,
              fontSize: 12,
              backgroundColor: 'white',
              borderColor: 'black',
              borderWidth: 1,
              padding: [4, 8],
              formatter: '{b}',
            },
          },
        ],
      };

      const parentNodeX = (document.documentElement.clientWidth - data.nodes[0].x) / 2;
      const nodesByDepth = new Map();
      data.nodes.forEach(node => {
        if (!nodesByDepth.has(node.y)) {
          nodesByDepth.set(node.y, []);
        }
        nodesByDepth.get(node.y).push(node);
      });

      nodesByDepth.forEach(nodes => {
        const parentIndex = Math.floor(nodes.length / 2);
        nodes.forEach((node, index) => {
          const offset = index - parentIndex;
          node.x = parentNodeX + offset * 200; 
        });
      });

      myChart.setOption(option);
    });
  `;
}
// 生成 ECharts 数据对象
function generateEChartsData(rootNode) {
    const nodesArray = [];
    const linksArray = [];
    const nodePositions = new Map();
    let currentX = 500;
    let xStep = 200;
    function traverse(node, x, depth) {
        const nodePositionKey = `${node.name}\n${node.version}`;
        if (!nodePositions.has(nodePositionKey)) {
            const y = depth * 100;
            nodePositions.set(nodePositionKey, { x: x, y: y });
            nodesArray.push({
                name: `${node.name}\n${node.version}`,
                x: x,
                y: y,
                label: {
                    show: true,
                    fontSize: 12,
                    backgroundColor: 'white',
                    borderColor: 'black',
                    borderWidth: 1,
                    padding: [4, 8],
                    formatter: '{b}',
                },
            });
            if (node.dependencies.length > 0) {
                const startY = y + 100;
                let startX = x - (node.dependencies.length - 1) * xStep / 2;
                for (const dep of node.dependencies) {
                    traverse(dep, startX, depth + 1);
                    const depPositionKey = `${dep.name}\n${dep.version}`;
                    if (!nodePositions.has(depPositionKey)) {
                        nodePositions.set(depPositionKey, { x: startX, y: startY });
                        nodesArray.push({
                            name: `${dep.name}\n${dep.version}`,
                            x: startX,
                            y: startY,
                            label: {
                                show: true,
                                fontSize: 12,
                                backgroundColor: 'white',
                                borderColor: 'black',
                                borderWidth: 1,
                                padding: [4, 8],
                                formatter: '{b}',
                            },
                        });
                    }
                    linksArray.push({
                        source: nodePositionKey,
                        target: depPositionKey,
                        label: {
                            show: false,
                            backgroundColor: 'white',
                            borderColor: 'black',
                            borderWidth: 1,
                            borderRadius: 4,
                            padding: [4, 8],
                            rotate: 0,
                            formatter: `${node.name} > ${dep.name}`,
                        },
                        emphasis: {
                            label: {
                                show: true,
                            },
                            lineStyle: {
                                color: 'black',
                            },
                        },
                    });
                    startX += xStep;
                }
            }
        }
    }
    traverse(rootNode, currentX, 0);
    const data = {
        nodes: nodesArray,
        links: linksArray
    };
    const dataString = JSON.stringify(data, null, 2)
        .replace(/"([^"]+)":/g, '$1:')
        .replace(/"(\d+)"/g, '$1');
    return dataString;
}
// 生成分析内容的HTML片段
function generateAnalysisContent(packageVersions, circularPaths) {
    let analysisContent = '<h2>循环依赖分析：</h2>';
    const uniqueCircularPaths = Array.from(new Set(circularPaths));
    if (uniqueCircularPaths.length > 0) {
        const uniquePathsSet = new Set();
        analysisContent += '<ul>';
        uniqueCircularPaths.forEach(dependencyPath => {
            if (!uniquePathsSet.has(dependencyPath)) {
                analysisContent += `<li>${dependencyPath} 存在循环依赖。</li>`;
                uniquePathsSet.add(dependencyPath);
            }
        });
        analysisContent += '</ul>';
    }
    else {
        analysisContent += '<p>项目不存在循环依赖。</p>';
    }
    let hasMultipleVersions = false;
    analysisContent += '<h2>多版本实例分析：</h2>';
    analysisContent += '<ul>';
    packageVersions.forEach((versions, packageName) => {
        if (versions.size > 1) {
            hasMultipleVersions = true;
            analysisContent += `<li>${packageName} 存在版本：${Array.from(versions).join('、')}</li>`;
        }
    });
    if (!hasMultipleVersions) {
        analysisContent += '<p>项目不存在同一个包拥有多个版本。</p>';
    }
    analysisContent += '</ul>';
    return analysisContent;
}
