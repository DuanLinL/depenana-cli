import * as path from 'path';
import { analyzePackageJSON, DependencyNode } from './analyzer';

// 检测循环依赖
export function detectCircularDependencies(node: DependencyNode): string[] {
  const circularPaths: string[] = []; // 存储检测到的循环依赖路径的数组
  const visitedNodes: Set<string> = new Set(); // 记录已经访问过的节点
  const processedNodes: Set<string> = new Set(); // 记录已经处理过的节点，防止重复处理

  // dfs遍历依赖树，检测循环依赖
  function dfs(currentNode: DependencyNode, path: string[]) {
    const nodeKey = `${currentNode.name}:${currentNode.version}`;

    if (processedNodes.has(nodeKey)) {
      return; // 如果节点已经处理过，直接返回，防止重复处理
    }

    if (visitedNodes.has(nodeKey)) {
      // 如果节点已经访问过，说明存在循环依赖
      const cycleStartIndex = path.indexOf(nodeKey);
      if (cycleStartIndex !== -1) {
        // 找到循环依赖的起始节点
        const cyclePath = path.slice(cycleStartIndex).join(' -> ') + ` -> ${nodeKey}`;
        circularPaths.push(cyclePath); // 将循环依赖路径添加到数组中
        processedNodes.add(nodeKey); // 标记节点已处理，避免重复添加
      }
      return;
    }

    visitedNodes.add(nodeKey);

    for (const dependency of currentNode.dependencies) {
      dfs(dependency, [...path, nodeKey]); // 递归检查当前节点的依赖
    }

    visitedNodes.delete(nodeKey); // 遍历完后移除当前节点的标记
  }

  dfs(node, []); // 从根节点开始执行dfs

  return circularPaths; // 返回检测到的循环依赖路径数组
}

// 检测多版本实例
export function detectMultipleVersions(rootNode: DependencyNode): Map<string, Set<string>> {
  const packageVersions: Map<string, Set<string>> = new Map(); // 存储包名及其对应版本的映射

  // 递归遍历依赖树，记录每个包的不同版本
  function checkVersions(node: DependencyNode) {
    if (!packageVersions.has(node.name)) {
      packageVersions.set(node.name, new Set()); // 若未记录过该包名，初始化映射
    }
    packageVersions.get(node.name)!.add(node.version); // 添加版本到包名对应的集合中

    for (const dep of node.dependencies) {
      checkVersions(dep); // 递归检查当前节点的依赖
    }
  }

  checkVersions(rootNode); // 从根节点开始执行版本检测

  return packageVersions; // 返回包名及其对应版本的映射
}
