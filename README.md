# Skill-Auto-MiniprogramDebug

微信小程序自动化测试 skill，用于 OpenCode / Claude Code 等 AI agent。

## 安装

将 `skills/wechat-miniprogram-automation/` 复制到以下任一位置：

| 位置 | 作用域 |
|------|--------|
| `.opencode/skills/` | 项目 |
| `~/.config/opencode/skills/` | 全局 |
| `.claude/skills/` | 项目 (Claude 兼容) |
| `~/.claude/skills/` | 全局 (Claude 兼容) |

## 内容

- `SKILL.md` — skill 定义和行为规则
- `templates/diagnose.js` — 自动化诊断脚本模板

## 实战案例

在使用 skill 对 `E:\AI\wechatbot` 项目进行自动化调试的过程中，AI agent 在无人干预下自主完成了以下工作：

### 任务

```
帮我用 wechat-miniprogram-automation，调试 E:\AI\wechatbot 这个项目
```

AI 自行检查 CLI 路径 → 验证服务端口 → 试跑基本测试 → 发现并修复 Bug → 全量回归。

### 发现并修复的 Bug

| Bug | 原因 | 修复 |
|-----|------|------|
| `cp.path is not a function` | `miniprogram-automator` 中 `Page.path` 是属性（`this.path = e.path`），不是方法 | `await cp.path()` → `cp.path` |
| `webview count limit exceed` | 非 tab 页面用 `navigateTo()` 会压栈，微信小程序限制约 10 层，遍历 23 页时栈满崩溃 | `navigateTo()` → `redirectTo()`（替换当前页，不增加栈深度） |

### 测试结果

```
23/23 页面导航 ✓ | 4/4 搜索测试 ✓ | 0 console errors ✓ | 0 JS 异常 ✓
```

### 附加改进

| 项目 | 改进前 | 改进后 |
|------|--------|--------|
| 首页启动耗时 | 无记录 | 显示 23102ms |
| 页面导航失败 | 无重试 | 自动重试 1 次 |
| 断开连接 | 无 | try/finally 保证断开 |
| 进程残留 | 无 | 启动前自动清理旧进程 |
| JSON 输出 | 无 | `--json` 标志支持 CI |
