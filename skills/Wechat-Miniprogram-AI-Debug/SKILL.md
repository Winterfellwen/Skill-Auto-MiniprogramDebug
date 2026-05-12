---
name: wechat-miniprogram-ai-debug
description: 微信小程序自动化测试 skill。当被加载时，必须实际运行 DevTools CLI + 执行 diagnose.js 脚本，不得仅输出文本方案。触发词：小程序/automator/DevTools/诊断。
slug: wechat-miniprogram-ai-debug
license: MIT
compatibility: opencode
metadata:
  platform: windows
  tooling: miniprogram-automator
---

# Invocation

```
/Wechat-Miniprogram-AI-Debug [自定义指令]
```

# EXECUTION RULES — 必须遵守，违反即错误

## CRITICAL: 禁止只输出文本

**你必须实际执行命令，禁止仅输出方案、建议、计划或代码。**

- 禁止以"以下是优化建议"/"以下是所做工作的摘要"/"Let me check..."开头然后只输出文字
- 禁止创建或修改文件后只输出摘要而不运行测试验证
- 你的第一个动作必须是运行命令（用 Bash 工具），不是写字

## 必须执行的步骤（按顺序）

当此 skill 被加载，用户提出涉及小程序测试/诊断/优化的请求时，你必须：

**Step 1 — 清理残留进程**
```powershell
Get-Process -Name "wechatdevtools","微信开发者工具*" -ErrorAction SilentlyContinue | Stop-Process -Force
```
（先清理再启动，否则端口冲突）

**Step 2 — 启动 DevTools 自动化服务**
用 cmd.exe 包装 cli.bat（直接 spawn .bat 会报 EINVAL）：
```powershell
cmd.exe /c "E:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" auto --project E:\AI\wechatbot --auto-port 9420
```
等待输出 `√ auto` 确认启动成功。

**Step 3 — 运行诊断脚本**
```bash
cd E:\AI\wechatbot && node tests/diagnose.js
```
如果 tests/diagnose.js 不存在，参照 templates/diagnose.js 模板用 Bash 工具创建。

**Step 4 — 读取并分析结果**
从测试输出中提取：
- 页面通过数 / 失败数
- console errors / JS 异常
- 搜索测试结果

**Step 5 — 如果有失败，修复后回到 Step 1 重试**

**Step 6 — finally 断开连接 + 杀进程**

## 技术约束

1. **`.bat` 文件必须用 `cmd.exe /c` 包装** — `spawn()` 不能直接运行 `.bat`
2. **非 tab 页面用 `redirectTo` 不用 `navigateTo`** — 后者撑爆页面栈
3. **`automator.on('console')` 捕获不全** — 框架级消息（`[system]`、`[Perf]`、`Error: timeout`）不可达
4. **搜索测试加 `evaluate()` 回退** — 当 `page.$('input')` 找不到时，直接 setData

## 当此 skill 应被加载

用户提到以下内容时你必须加载此 skill：
- 使用 `/Wechat-Miniprogram-AI-Debug` 命令
- 微信小程序 / WeChat / miniprogram 相关的测试、诊断、优化
- 涉及 `E:\AI\wechatbot` 项目的自动化或调试
- 关键词：automator / DevTools / CLI / diagnose / 页面路由 / 搜索测试
- 用户明确说 "用 Wechat-Miniprogram-AI-Debug"

---

## CLI 启动自动化服务

```powershell
# 必须用 cmd.exe /c 包装 .bat，直接 spawn 会报 EINVAL
cmd.exe /c "E:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" auto --project E:\AI\wechatbot --auto-port 9420
```
等待输出 `√ auto` 确认启动成功。

## 连接

```javascript
const automator = require('miniprogram-automator');
const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
```

## 导航规则

| 页面类型 | 方法 |
|----------|------|
| tabBar 页面 | `switchTab('/pages/index/index')` |
| 非 tab 页面 | `redirectTo('/german/pages/learn/learn')` — 避免 navigateTo 撑爆页面栈 |

## 监听

```javascript
miniProgram.on('console', msg => { /* 只捕获 JS 层 log，框架消息不可达 */ });
miniProgram.on('exception', err => { /* JS 异常 */ });
```

## 已知限制

- **`.bat` spawn EINVAL** — 必须用 `cmd.exe /c` 包装
- **console 捕获不全** — `[system]`、`[Perf]`、`Error: timeout` 不可达
- **搜索 input 找不到时** — 用 `evaluate(() => { getCurrentPages().pop().setData({ searchKey: 'test' }) })` 回退
- **`navigateTo` 撑爆页面栈** — 非 tab 页面优先用 `redirectTo`

## 诊断脚本

`tests/diagnose.js` — 自动启动 CLI → 遍历 26 页面 → 搜索测试 → console 捕获 → 报告
`tests/diagnose-full.js` — 全功能测试（含按钮交互、PDF 转换模拟、30 页面验证）
`templates/diagnose.js` — 备用模板 (同目录)
