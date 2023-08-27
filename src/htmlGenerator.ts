import * as fs from 'fs';
import { exec } from 'child_process';
import { analyzePackageJSON, DependencyNode } from './analyzer';
import { detectCircularDependencies, detectMultipleVersions } from './dependencyAnalyzer';

//生成并打开 HTML 页面
export async function generateAndOpenHTML(projectRoot: string, packageJsonPath: string, depth: number): Promise<void> {
  const visitedPackages: Set<string> = new Set(); 
  const packageJSONContent = await fs.promises.readFile(packageJsonPath, 'utf8');
  const packageJSON = JSON.parse(packageJSONContent);
  const rootNode = await analyzePackageJSON(projectRoot, packageJSON, visitedPackages, depth);
  const packageVersions = detectMultipleVersions(rootNode);
  const circularPaths = detectCircularDependencies(rootNode);
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
  exec(`${openCommand} ${filePath}`, (error) => {
    if (error) {
      console.error('Error occurred while opening the HTML page:', error);
    } else {
      console.log(`Generated HTML page: ${filePath}`);
    }
  });
}

// 生成 JavaScript 脚本内容
function generateScriptContent(rootNode: DependencyNode): string {
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
function generateEChartsData(rootNode: DependencyNode): string {
  const nodesArray = [];
  const linksArray = [];
  const nodePositions = new Map();

  let currentX = 500;
  let xStep = 200;

  function traverse(node: DependencyNode, x: number, depth: number) {
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
function generateAnalysisContent(packageVersions: Map<string, Set<string>>, circularPaths: string[]): string {
  let analysisContent = '<h2>循环依赖分析：</h2>';

  const uniqueCircularPaths = Array.from(new Set(circularPaths));

  if (uniqueCircularPaths.length > 0) {
    const uniquePathsSet = new Set<string>();

    analysisContent += '<ul>';
    uniqueCircularPaths.forEach(dependencyPath => {
      if (!uniquePathsSet.has(dependencyPath)) {
        analysisContent += `<li>${dependencyPath} 存在循环依赖。</li>`;
        uniquePathsSet.add(dependencyPath);
      }
    });
    analysisContent += '</ul>';
  } else {
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



