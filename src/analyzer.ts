import fs from 'fs';
import path from 'path';

// 定义依赖节点的接口
export interface DependencyNode {
  name: string;
  version: string;
  dependencies: DependencyNode[];
}


// 分析 package.json 文件，获取依赖信息
export async function analyzePackageJSON(packageDirectory: string, packageJSON: any, visitedPackages: Set<string>, depth: number): Promise<DependencyNode> {
  // 获取包名和版本号
  const packageName = packageJSON.name;
  const packageVersion = packageJSON.version as string;

  // 如果当前包已经访问过，说明存在循环依赖，返回一个空的依赖节点
  if (visitedPackages.has(packageName)) {
    return {
      name: packageName,
      version: packageVersion,
      dependencies: [],
    };
  }

  // 将当前包添加到已访问列表中
  visitedPackages.add(packageName);

  // 获取所有直接依赖
  const dependencies: DependencyNode[] = [];

  // 递归获取依赖的依赖
  if (depth > 1) {
    for (const [depName] of Object.entries(packageJSON.dependencies || {})) {
      const depDirectory = path.join(packageDirectory, 'node_modules', depName);
      const depPackageJsonPath = path.join(depDirectory, 'package.json');
      const depPackageJSONContent = await fs.promises.readFile(depPackageJsonPath, 'utf8');
      const depPackageJSON = JSON.parse(depPackageJSONContent);

      // 设置固定的项目 node_modules 目录作为检索路径
      const subDep = await analyzePackageJSON(packageDirectory, depPackageJSON, visitedPackages, depth - 1);
      dependencies.push(subDep);
    }
  }

  // 创建当前依赖节点对象
  const dependencyNode: DependencyNode = {
    name: packageName,
    version: packageVersion,
    dependencies,
  };

  // 移除已访问标记，以便其他分支也能够正确处理该包
  visitedPackages.delete(packageName);

  return dependencyNode;
}