<p align="center">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug"><img src="https://img.shields.io/github/v/release/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=for-the-badge&color=blue" alt="GitHub Release"></a>
  <img src="https://img.shields.io/badge/WeChat_Miniprogram-07C160?style=for-the-badge&logo=wechat&logoColor=white" alt="WeChat Miniprogram">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node 18+">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug/stargazers"><img src="https://img.shields.io/github/stars/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=flat-square&logo=github" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/OpenCode-compatible-6366f1?style=flat-square" alt="OpenCode">
  <img src="https://img.shields.io/badge/Claude%20Code-compatible-6366f1?style=flat-square" alt="Claude Code">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square" alt="Windows">
</p>

<h1 align="center">WeChat Miniprogram AI Debug</h1>

<p align="center">
  AI-driven automated testing skill for WeChat Mini Programs.<br>
  Leverages <code>miniprogram-automator</code> to drive DevTools CLI — traverse pages, test search interactions, click buttons, and capture console/exception output — all autonomously via OpenCode or Claude Code.
</p>

---

## What This Skill Does

This skill provides an AI agent with the ability to **autonomously test and debug** a WeChat Mini Program project using `miniprogram-automator`. When invoked, the agent will:

1. Launch the WeChat DevTools automation service
2. Connect via WebSocket
3. Traverse all registered page routes
4. Test search input interactions
5. Click buttons and verify UI state
6. Capture console errors and JS exceptions
7. Report a structured diagnosis summary

The skill encodes hard-learned lessons from real-world debugging — including workarounds for `.bat` spawn EINVAL, page stack overflow limits, and API gaps in `miniprogram-automator`.

## Installation

Place `Wechat-Miniprogram-AI-Debug/` into one of these paths:

| Path | Scope |
|------|-------|
| `.opencode/skills/<name>/` | Project |
| `~/.config/opencode/skills/<name>/` | Global |
| `.claude/skills/<name>/` | Project (Claude) |
| `~/.claude/skills/<name>/` | Global (Claude) |
| `.agents/skills/<name>/` | Project (Agent) |
| `~/.agents/skills/<name>/` | Global (Agent) |

### Quick Install

```bash
# global install
mkdir -p ~/.config/opencode/skills/Wechat-Miniprogram-AI-Debug
cp -r skills/Wechat-Miniprogram-AI-Debug/* ~/.config/opencode/skills/Wechat-Miniprogram-AI-Debug/
```

## Usage

### Slash Command

```
/Wechat-Miniprogram-AI-Debug [custom instructions]
```

### Prompts

```
帮我调试 E:\AI\wechatbot 这个项目

用 automator 测试 all pages

帮我测试 pdf 转换功能
```

## Contents

| Path | Description |
|------|-------------|
| `SKILL.md` | Skill definition & AI behavioral rules |
| `templates/diagnose.js` | Reusable diagnosis script template |

---

## Real-world Case Study

The following session was executed entirely by an AI agent with zero human intervention — the agent inspected the project, discovered bugs, fixed them, and verified all tests pass.

### Result

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
