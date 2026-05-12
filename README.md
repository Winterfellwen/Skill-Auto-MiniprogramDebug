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

The following session was executed entirely by an AI agent with zero human intervention — the agent inspected the project, discovered bugs, fixed them, and verified all tests pass.

### Prompt

```
帮我用 wechat-miniprogram-automation，调试 E:\AI\wechatbot 这个项目
```

### Bugs Found & Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `cp.path is not a function` | `miniprogram-automator` exposes `path` as a **property** (`this.path = e.path`), not a method | `await cp.path()` → `cp.path` |
| `webview count limit exceed` | `navigateTo()` pushes pages onto the stack; WeChat caps it at ~10 layers. Traversing 23 pages blew the stack. | `navigateTo()` → `redirectTo()` (replaces current page, stack stays flat) |

### Test Result

```
23/23  pages  ✓  |  4/4  search  ✓  |  0  console errors  ✓  |  0  JS exceptions  ✓
```

### Improvements Made

| Area | Before | After |
|------|--------|-------|
| Startup timing | not tracked | logged as 23102ms |
| Page nav failure | no retry | auto retry once |
| Connection cleanup | none | try/finally guaranteed disconnect |
| Process leak | none | auto-clean stale DevTools before launch |
| CI output | none | `--json` flag for machine-readable output |

---

## License

MIT
