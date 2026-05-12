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
  基于 <code>miniprogram-automator</code> 的微信小程序自动化测试 skill。<br>
  AI 自动驱动 DevTools CLI，遍历页面、测试搜索交互、点击按钮、捕获 console 错误和 JS 异常。
</p>

---

## 功能

AI 代理被调用后，自动完成以下操作：

1. 启动微信开发者工具自动化服务
2. 通过 WebSocket 连接
3. 遍历所有已注册的页面路由
4. 测试搜索输入交互
5. 点击按钮并验证页面状态
6. 捕获 console 错误和 JS 异常
7. 输出结构化诊断报告

Skill 中编码了实战中积累的经验——包括 `.bat` spawn EINVAL 的绕过方案、页面栈溢出限制的规避、以及 `miniprogram-automator` API 的已知缺陷处理。

## 安装

将 `Wechat-Miniprogram-AI-Debug/` 放入以下任意目录：

| 路径 | 作用域 |
|------|--------|
| `.opencode/skills/<name>/` | 项目 |
| `~/.config/opencode/skills/<name>/` | 全局 |
| `.claude/skills/<name>/` | 项目（Claude） |
| `~/.claude/skills/<name>/` | 全局（Claude） |
| `.agents/skills/<name>/` | 项目（Agent） |
| `~/.agents/skills/<name>/` | 全局（Agent） |

### 快速安装

```bash
# 全局安装
mkdir -p ~/.config/opencode/skills/Wechat-Miniprogram-AI-Debug
cp -r skills/Wechat-Miniprogram-AI-Debug/* ~/.config/opencode/skills/Wechat-Miniprogram-AI-Debug/
```

## 使用

### 斜杠命令

```
/Wechat-Miniprogram-AI-Debug [自定义指令]
```

### 示例

```
帮我调试 E:\AI\wechatbot 这个项目

用 automator 测试 all pages

帮我测试 pdf 转换功能
```

## 文件说明

| 路径 | 说明 |
|------|------|
| `SKILL.md` | Skill 定义和 AI 行为规则 |
| `templates/diagnose.js` | 诊断脚本模板 |

---

## 实战案例

以下测试会话由 AI 代理完全自主执行——检查项目、发现 Bug、修复、验证通过，全程无需人工干预。

### 结果

```
调试完成。修复了两个 Bug，测试全部通过。

调试结果
23/23 页面导航 ✓ | 4/4 搜索测试 ✓ | 0 console errors ✓ | 0 JS 异常 ✓

发现并修复的 Bug
Bug 1: cp.path is not a function
文件: tests/shared.js:94、tests/miniprogram-automator-test.js:44
原因: miniprogram-automator 中 Page.path 是属性（this.path = e.path），不是方法
修复: await cp.path() → cp.path

Bug 2: webview count limit exceed
文件: tests/shared.js:91
原因: 非 tab 页面使用 navigateTo() 会压栈，微信小程序限制约 10 层。遍历 23 页时栈满崩溃
修复: navigateTo() → redirectTo()（替换当前页，不增加栈深度）

附加改进
项目           改进前     改进后
首页启动耗时   无记录     显示 23102ms
页面导航失败   无重试     自动重试 1 次
断开连接       无         try/finally 保证断开
进程残留       无         启动前自动清理旧进程
JSON 输出      无         --json 标志支持 CI
```

---

## License

MIT
