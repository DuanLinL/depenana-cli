"use strict";
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
exports.analyzePackageJSON = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 分析 package.json 文件，获取依赖信息
function analyzePackageJSON(packageDirectory, packageJSON, visitedPackages, depth) {
    return __awaiter(this, void 0, void 0, function* () {
        // 获取包名和版本号
        const packageName = packageJSON.name;
        const packageVersion = packageJSON.version;
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
        const dependencies = [];
        // 递归获取依赖的依赖
        if (depth > 1) {
            for (const [depName] of Object.entries(packageJSON.dependencies || {})) {
                const depDirectory = path_1.default.join(packageDirectory, 'node_modules', depName);
                const depPackageJsonPath = path_1.default.join(depDirectory, 'package.json');
                const depPackageJSONContent = yield fs_1.default.promises.readFile(depPackageJsonPath, 'utf8');
                const depPackageJSON = JSON.parse(depPackageJSONContent);
                // 设置固定的项目 node_modules 目录作为检索路径
                const subDep = yield analyzePackageJSON(packageDirectory, depPackageJSON, visitedPackages, depth - 1);
                dependencies.push(subDep);
            }
        }
        // 创建当前依赖节点对象
        const dependencyNode = {
            name: packageName,
            version: packageVersion,
            dependencies,
        };
        // 移除已访问标记，以便其他分支也能够正确处理该包
        visitedPackages.delete(packageName);
        return dependencyNode;
    });
}
exports.analyzePackageJSON = analyzePackageJSON;
