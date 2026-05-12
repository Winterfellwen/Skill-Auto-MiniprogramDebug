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

**Step 2 — 验证项目配置并启动 DevTools 自动化服务**

1. **验证 app.json** — 读取 `<项目路径>/app.json`，检查每页的 `.wxml` 文件是否存在：
   ```powershell
   $json = Get-Content <项目路径>\app.json -Raw | ConvertFrom-Json
   $allPages = @()
   $json.pages | ForEach { $allPages += $_ }
   $json.subpackages | ForEach { $root = $_.root; $_.pages | ForEach { $allPages += "$root/$_" } }
   $allPages | Group-Object | Where-Object Count -gt 1 | ForEach { "重复: $($_.Name)" }
   $allPages | ForEach { if (!(Test-Path "<项目路径>/$_.wxml")) { "缺失: $_.wxml" } }
   ```
   有重复或缺失则先修复再继续。
2. **查找 cli.bat** — 检查默认路径 `C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`，不存在则依次检查其他盘符（D:、E:、F: 等）
3. **启动自动化服务**：
   ```powershell
   cmd.exe /c "<完整路径>" auto --project <项目路径> --auto-port 9420
   ```
4. **连接后校验编译状态** — DevTools CLI 输出 `√ auto` 不代表编译成功。连接 automator 后必须验证：
   ```javascript
   const cp = await Promise.race([
     miniProgram.currentPage(),
     new Promise((_, reject) => setTimeout(() => reject(new Error('currentPage超时——项目编译可能失败')), 8000))
   ]);
   ```
   如果 currentPage 超时，说明项目有编译错误。先跑个页面导航试试，确认失败后再查 DevTools 日志：
   ```powershell
   Get-ChildItem "$env:USERPROFILE\AppData\Local\微信开发者工具\User Data\*\WeappLog\logs\*.log" -ErrorAction SilentlyContinue |
     Sort-Object LastWriteTime -Descending | Select-Object -First 1 |
     ForEach-Object { Get-Content $_.FullName -Encoding UTF8 |
       Select-String "\[ERROR\]" | Where-Object { $_ -match "app\.json|appservice" } |
       ForEach-Object { $_.Line.Trim() } }
   ```
   根据日志提示修复后重新从 Step 1 开始
5. 若所有常见路径均未找到 cli.bat，请用户提供微信开发者工具安装路径

**Step 3 — 生成诊断脚本（始终重新生成）**

无论 `<项目路径>\tests\diagnose.js` 是否存在，都必须重新生成。

```powershell
# 1. 读取 app.json 获取所有页面
# 2. 扫描每个页面的 .wxml 获取组件和事件绑定
# 3. 生成 tests/diagnose.js

# 读取页面
$json = Get-Content <项目路径>\app.json -Raw | ConvertFrom-Json
$allPages = @()
$json.pages | ForEach { $allPages += @{ path = $_; tab = $false } }
$json.subpackages | ForEach { $root = $_.root; $_.pages | ForEach { $allPages += @{ path = "$root/$_"; tab = $false } } }
if ($json.tabBar -and $json.tabBar.list) {
  $json.tabBar.list | ForEach { $tabPath = $_.pagePath; for ($i = 0; $i -lt $allPages.Length; $i++) { if ($allPages[$i].path -eq $tabPath) { $allPages[$i].tab = $true } } }
}
$allPages | ConvertTo-Json -Compress
```

然后用参考模板 `templates/diagnose.js` 为基础，替换其中的 `PAGES`、`ELEMENT_CHECKS`、`BUTTON_NAV_TESTS`、`FORM_TESTS`、`DATA_CHECKS`、`SCROLL_TESTS` 等配置区域为实际项目数据，写入 `<项目路径>\tests\diagnose.js`。

生成规则：
- **PAGES**：所有页面 + tab/search 标记
- **ELEMENT_CHECKS**：每个页面前 4-6 个组件标签
- **BUTTON_NAV_TESTS**：含 bindtap/click 的按钮/单元格
- **FORM_TESTS**：含 input/t-input/textarea/t-textarea 的页面
- **SCROLL_TESTS**：含 scroll-view 的页面
- **DATA_CHECKS**：搜索页等有明确 data 字段的页面

**Step 4 — 运行诊断脚本**
```powershell
node <项目路径>\tests\diagnose.js
```

**Step 5 — 读取并分析结果**
从测试输出中提取：
- 页面通过数 / 失败数
- 6 个测试模块各自的 passed / failed / skipped
- console errors + warnings + JS 异常
- **分类分析** — 按 `[噪音]/[修复]/[待判断]` 标签区分：

  | 严重度 | 含义 | 处理方式 |
  |--------|------|----------|
  | `[噪音]` | 组件属性类型不匹配、框架内部警告等 | 不修代码，记入最终报告并解释原因 |
  | `[修复]` | 引用错误、资源加载失败、脚本异常、已废弃 API | 修改对应文件后回到 Step 1 重试 |
  | `[待判断]` | 不在已知分类中的 error/warning | 分析源码后决定是否修复 |

**Step 6 — 修复与报告**
1. 对于 `[修复]` 类：修改对应文件后回到 Step 1 重试
2. 对于 `[噪音]` 类：不修改代码，在最终报告中归类说明原因
3. 最终报告包含：页面结果、6 个测试模块结果、errors/warnings 分类统计、各噪音项的简要解释

**Step 7 — 断开连接 + 打开 DevTools 供用户查看**
```javascript
miniProgram.disconnect();
```
诊断完成后，保持 DevTools 运行并打开其窗口，让用户能直观看到模拟器状态、Console 面板等：
```powershell
cmd.exe /c "<CLI_PATH>" open --project <项目路径>
```
然后打印提示告知用户可以查看效果了。

注意：不要调用 `Stop-Process` 杀掉 DevTools。保持 DevTools 运行，用户会自行关闭。

---

## 诊断脚本结构（6 个测试模块）

`tests/diagnose.js` 包含以下模块，按优先级排列：

| 优先级 | 模块 | 说明 | 实现方式 |
|--------|------|------|----------|
| P0 | 元素存在性检查 | 验证页面核心组件已渲染 | `page.$(selector)` + 3s 超时 |
| P0 | 按钮交互与跳转 | 点击按钮，验证目标页面到达 | `element.tap()` + `currentPage()` |
| P0 | TabBar 切换 | 遍历所有 tab 页面，验证切换正常 | `switchTab()` + 元素校验 |
| P1 | 表单输入 | input/t-input/textarea 输入文本 | `element.input(value)` |
| P1 | 页面数据校验 | 检查页面 data 字段类型和值 | `page.data(path)` |
| P2 | 滚动/下拉刷新 | 模拟 touchstart→touchmove→touchend | `scroll-view.touch*()` |

### 配置数据生成（Skill Step 3 负责）

```
PAGES              ← app.json 解析
ELEMENT_CHECKS     ← WXML 标签提取（每个页面取前 4-6 个）
BUTTON_NAV_TESTS   ← WXML 中 bindtap/click 的按钮组件
TAB_BAR_ITEMS      ← app.json.tabBar.list
FORM_TESTS         ← WXML 含 input/t-input/textarea/t-textarea 的页面
SCROLL_TESTS       ← WXML 含 scroll-view 的页面
DATA_CHECKS        ← 搜索页等常见 data 字段
```

### 噪音分类引擎

16 条内置规则，分为两类：

**噪音类（noise）** — 仅报告，不修复：
- 组件属性类型不匹配、组件内部警告、框架日志
- setData 过大/频繁、Loading 频繁调用
- 插件/商业化日志

**可修复类（fixable）** — 自动修复或建议：
- 已废弃 API、引用错误、资源加载失败、脚本异常
- 非 HTTPS 请求、路由异常、授权相关
- 资源/页面不存在

### 自动修复

扫描项目 JS 文件，按规则修复或建议：
- `http://` → `https://`（跳过 mock 目录）
- `wx.getUserInfo` → 建议迁移
- `console.log/info/debug` → 建议删除（生产代码）
- `wx.show/hideNavigationBarLoading` → 建议迁移

## 技术约束

1. **`.bat` 文件必须用 `cmd.exe /c` 包装** — `spawn()` 不能直接运行 `.bat`
2. **非 tab 页面用 `redirectTo` 不用 `navigateTo`** — 后者撑爆页面栈
3. **`automator.on('console')` 捕获不全** — 框架级消息（`[system]`、`[Perf]`、`Error: timeout`）不可达，报告中已标注此限制
4. **搜索测试加 `evaluate()` 回退** — 当 `page.$('input')` 找不到时，直接 setData
5. **`switchTab`/`redirectTo` 必须加超时** — 用 `Promise.race` 包装，设置 15s 超时
6. **渲染层错误无法自动化捕获** — WXML/WXSS/数据绑定异常属于框架内部，报告中会注明
7. **原始 winston 日志文件** — 编译错误可查 DevTools 日志文件（路径见 Step 2）

## 当此 skill 应被加载

用户提到以下内容时你必须加载此 skill：
- 使用 `/Wechat-Miniprogram-AI-Debug` 命令
- 微信小程序 / WeChat / miniprogram 相关的测试、诊断、优化
- 涉及 `E:\AI\wechatbot` 项目的自动化或调试
- 关键词：automator / DevTools / CLI / diagnose / 页面路由 / 搜索测试
- 用户明确说 "用 Wechat-Miniprogram-AI-Debug"

---

## CLI 启动自动化服务

先验证 app.json 无重复/格式错误，然后自动查找 cli.bat（C: → D: → E: → F:），找到后启动：
```powershell
cmd.exe /c "<cli.bat完整路径>" auto --project <项目路径> --auto-port 9420
```
等待输出 `√ auto` 确认启动成功。若输出包含 `error`/`错误`，先修复项目配置再重试。

## 连接

```javascript
const automator = require('miniprogram-automator');
const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' });
```

## 导航规则

| 页面类型 | 方法 |
|----------|------|
| tabBar 页面 | `switchTab('<页面路径>')` |
| 非 tab 页面 | `redirectTo('<页面路径>')` — 避免 navigateTo 撑爆页面栈 |

## 监听

```javascript
miniProgram.on('console', msg => { /* 只捕获 JS 层 log，框架消息不可达 */ });
miniProgram.on('exception', err => { /* JS 异常 */ });
```

## 诊断脚本

`tests/diagnose.js` — 由 Step 3 根据项目结构自动生成，包含 6 个测试模块

生成依据：
- `app.json` → 页面列表 + TabBar
- 各页面 `.wxml` → 组件标签 + 事件绑定
- `templates/diagnose.js` → 测试逻辑模板

生成的脚本会自动过滤不可用的测试（如找不到元素则标记失败而非崩溃），报告会注明所有已知限制。
