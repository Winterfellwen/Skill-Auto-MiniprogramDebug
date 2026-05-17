<p align="center">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug"><img src="https://img.shields.io/github/v/release/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=for-the-badge&color=blue" alt="GitHub Release"></a>
  <img src="https://img.shields.io/badge/微信小程序-07C160?style=for-the-badge&logo=wechat&logoColor=white" alt="微信小程序">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node 18+">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug/stargazers"><img src="https://img.shields.io/github/stars/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=flat-square&logo=github" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/OpenCode-兼容-6366f1?style=flat-square" alt="OpenCode">
  <img src="https://img.shields.io/badge/Claude%20Code-兼容-6366f1?style=flat-square" alt="Claude Code">
  <img src="https://img.shields.io/badge/平台-Windows-0078D4?style=flat-square" alt="Windows">
</p>

<h1 align="center">WeChat Miniprogram AI Debug</h1>

<p align="center">
  基于 <code>miniprogram-automator</code> 的微信小程序 AI 诊断 skill。<br>
  AI 直接驱动 DevTools CLI，逐页遍历、分析元素、捕获错误、自动修复。
  <br><strong>不再需要 diagnose.js 脚本，所有操作由 AI 直接使用 automator API 执行。</strong>
</p>

---

## 功能

| 命令 | 说明 |
|------|------|
| `/wechat-miniprogram-debug-scan <路径>` | 遍历所有页面，分析元素，诊断错误，输出修复建议（不修改代码） |
| `/wechat-miniprogram-debug-fix <路径>` | 遍历所有页面，诊断并自动修复代码问题，备份原项目 |

AI 驱动完成以下操作：
1. 启动微信开发者工具自动化服务 + 连接
2. 读取 app.json 获取页面结构
3. 自主决定遍历顺序和交互深度
4. 用 WXML 扫描检测组件存在性
5. 捕获 console 错误和 JS 异常
6. 按严重度分类（噪音/可修复）
7. 输出诊断报告 + 修复方案（Scan）或自动修复 + 修复记录（Fix）

**此 skill 非显式调用不会自动激活。`/wechat-miniprogram-debug-scan` 和 `/wechat-miniprogram-debug-fix` 命令会自动加载 skill。**

---

## 安装

```powershell
git clone https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug.git
cd Wechat-Miniprogram-AI-Debug
```

或直接复制 skill 和命令到全局：

```powershell
# skill
cp -r .opencode/skills/wechat-miniprogram-debug ~/.config/opencode/skills/
# commands
cp .opencode/commands/wechat-miniprogram-debug-*.md ~/.config/opencode/commands/
```

也可复制到以下任意位置：

| 路径 | 作用域 | 说明 |
|------|--------|------|
| `.opencode/skills/<name>/` | 项目 | 本仓库已自带 |
| `~/.config/opencode/skills/<name>/` | 全局 | 所有项目可用 |
| `.opencode/commands/<name>.md` | 项目 | 本仓库已自带 |
| `~/.config/opencode/commands/<name>.md` | 全局 | 所有项目可用 |

---

## 使用

### 斜杠命令

```
/wechat-miniprogram-debug-scan E:\AI\wechatbot
/wechat-miniprogram-debug-fix E:\AI\wechatbot
```

### 输出文件

扫描完成后在项目目录生成：

| 文件 | 说明 |
|------|------|
| `diagnose-report.txt` | 诊断报告（页面状态 + 错误分类 + 噪音列表） |
| `diagnose-fix-suggestions.txt` | **修复方案**（Scan 模式），含文件路径+行号+修改内容 |
| `diagnose-fix-log.txt` | **修复记录**（Fix 模式），含操作类型+变更内容+原因 |

Fix 模式在执行前会备份项目到 `<项目路径>_backup_<时间戳>/`。

---

## 文件说明

| 路径 | 说明 |
|------|------|
| `.opencode/skills/wechat-miniprogram-debug/SKILL.md` | Skill 定义和 AI 行为规则 |
| `.opencode/skills/wechat-miniprogram-debug/automator-api.md` | miniprogram-automator API 参考文档（AI 执行时查阅） |
| `.opencode/commands/wechat-miniprogram-debug-scan.md` | Scan 命令（自动加载 skill） |
| `.opencode/commands/wechat-miniprogram-debug-fix.md` | Fix 命令（自动加载 skill） |
| `README.md` | 本文件 |

---

## License

MIT
