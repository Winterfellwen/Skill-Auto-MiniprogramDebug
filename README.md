<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933" alt="Node 18+">
  <img src="https://img.shields.io/badge/OpenCode-compatible-6366f1" alt="OpenCode">
  <img src="https://img.shields.io/badge/Claude%20Code-compatible-6366f1" alt="Claude Code">
  <img src="https://img.shields.io/badge/Platform-Win-0078D4" alt="Windows">
</p>

<h1 align="center">WeChat Miniprogram Automation</h1>

<p align="center">
  AI-driven automated testing skill for WeChat Mini Programs.<br>
  Leverages <code>miniprogram-automator</code> to run DevTools CLI, traverse pages, test search interactions, and capture console/exception output — all autonomously via OpenCode or Claude Code.
</p>

---

## Install

Place `wechat-miniprogram-automation/` into one of these paths:

| Path | Scope |
|------|-------|
| `.opencode/skills/<name>/` | Project |
| `~/.config/opencode/skills/<name>/` | Global |
| `.claude/skills/<name>/` | Project (Claude) |
| `~/.claude/skills/<name>/` | Global (Claude) |
| `.agents/skills/<name>/` | Project (Agent) |
| `~/.agents/skills/<name>/` | Global (Agent) |

```bash
# global install
mkdir -p ~/.config/opencode/skills/wechat-miniprogram-automation
cp -r skills/wechat-miniprogram-automation/* ~/.config/opencode/skills/wechat-miniprogram-automation/
```

## Contents

| Path | Description |
|------|-------------|
| `SKILL.md` | Skill definition & AI behavioral rules |
| `templates/diagnose.js` | Reusable diagnosis script template |

---

## Real-world Case Study

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
