---
name: wechat-miniprogram-ai-debug
description: 微信小程序自动化测试 skill。当被加载时，必须实际运行 DevTools CLI + 执行 diagnose.js 脚本，不得仅输出文本方案。触发词：小程序/automator/DevTools/诊断。
slug: wechat-miniprogram-ai-debug
license: MIT
compatibility: opencode, claude code
version: 1.5.0
apiVersion: 1.0
metadata:
  platform: windows
  tooling: miniprogram-automator
  node: ">=18"
  tags:
    - wechat
    - miniprogram
    - testing
    - automation
examples:
  - /Wechat-Miniprogram-AI-Debug 帮我诊断 E:\AI\wechatbot
  - /Wechat-Miniprogram-AI-Debug 扫描并尝试修复
  - 用 automator 测试 all pages
---

# Invocation

```
/Wechat-Miniprogram-AI-Debug [自定义指令]
```

**注意：此 skill 非显式调用不会自动激活。必须通过 `/Wechat-Miniprogram-AI-Debug` 命令或用户明确提及才加载。**

# EXECUTION RULES — 必须遵守

## CRITICAL: 禁止只输出文本

**你必须实际执行命令，禁止仅输出方案、建议、计划或代码。**

- 禁止以"以下是优化建议"/"以下是所做工作的摘要"/"Let me check..."开头然后只输出文字
- 禁止创建或修改文件后只输出摘要而不运行测试验证
- 你的第一个动作必须是运行命令（用 Bash 工具），不是写字

## 核心流程

### Step 0 — 确定运行模式

默认以**仅扫描**模式运行，不执行自动修复。如需修复，请手动添加 `--fix` 参数。

---

### Step 1 — 检测并安装 SDK

**检测 SDK 是否已安装：**

1. **检查 package.json** — 检查用户项目目录是否存在 `package.json`，且是否包含 `miniprogram-automator` 依赖
2. **检查 node_modules** — 检查是否存在 `node_modules/miniprogram-automator`

**如果 SDK 未安装，执行安装：**

1. 如果项目目录没有 `package.json`，先执行 `npm init -y` 初始化
2. 执行 `npm install miniprogram-automator --save-dev` 安装 SDK
3. 提示用户：**必须在微信开发者工具中开启"自动化"端口**（设置 → 安全设置 → 开启"自动化"端口）

### Step 2 — 清理残留进程
```powershell
Get-Process -Name "wechatdevtools","微信开发者工具*" -ErrorAction SilentlyContinue | Stop-Process -Force
```
（先清理再启动，否则端口冲突）

### Step 3 — 启动 DevTools 自动化服务

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
3. **检测服务端口是否开启** — 尝试执行 CLI 命令，根据返回判断：
   - 若返回 `IDE service port disabled`，说明未开启，需要手动操作
   - 若返回 `initialize` 成功，说明已开启
4. **服务端口未开启时的处理**：
   - 提示用户必须手动开启：打开微信开发者工具 → 设置 → 安全设置 → 开启"服务端口"/"自动化"端口
   - 用户确认开启后，重新执行 CLI 命令
5. **启动服务**：
   ```powershell
   cmd.exe /c "<cli.bat完整路径>" auto --project <项目路径> --auto-port 9420
   ```
   等待输出 `√ auto` 确认启动成功。若输出包含 `error`/`错误`，先修复项目配置再重试。
6. **连接后校验编译状态** — DevTools CLI 输出 `√ auto` 不代表编译成功。连接 automator 后必须验证：
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
   根据日志提示修复后重新从 Step 2 开始。
7. 若所有常见路径均未找到 cli.bat，请用户提供微信开发者工具安装路径

> **注意**：微信开发者工具的服务端口（CLI/HTTP 调用功能）出于安全考虑必须手动确认开启，无法通过配置文件自动开启。首次开启后，后续使用无需再次确认。

### Step 4 — 生成诊断脚本（始终重新生成）

**无论 `tests/diagnose.js` 是否存在，都必须重新生成。**

```powershell
# 读取 app.json 获取所有页面，检测 tabBar 标记
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

### Step 5 — 运行诊断（默认扫描模式）

**如果用户没有明确说明要修复，则默认只扫描，不自动修复。**

```powershell
# 扫描模式（默认）
node <项目路径>\tests\diagnose.js --project <项目路径> --cli <cli路径> --port 9420 --scan-only
```

### Step 6 — 分析与分类

从测试输出提取：
- 页面通过数 / 失败数
- 测试模块各自的 passed / failed / skipped
- console errors + warnings + JS 异常

按严重度分类：
| 严重度 | 含义 | 处理 |
|--------|------|------|
| `[噪音]` | 组件属性类型不匹配、框架内部警告等 | 不修代码，记入报告 |
| `[修复]` | 引用错误、资源加载失败、脚本异常 | 记录修复方案 |
| `[待判断]` | 不在已知分类的 error/warning | 分析源码后决定 |

### Step 7 — 输出修复方案或执行修复

**用户未明确要求修复时（默认）：**
- 生成修复方案文档 `diagnose-fix-suggestions.txt`
- 方案必须包含：**具体文件路径 + 具体行号 + 具体修改内容**
- 格式示例：
  ```
  文件: pages/home/index.js
  行号: 15
  当前: wx.getUserInfo({
  建议: wx.getUserProfile({
  原因: wx.getUserInfo 已废弃
  ```
- 告知用户方案位置

**用户明确要求修复时：**
- 执行自动修复
- 生成修复记录文档 `diagnose-fix-log.txt`
- 记录必须包含：**文件路径 + 行号 + 操作类型（增加/删除/修改） + 具体内容**
- 格式示例：
  ```
  文件: pages/home/index.js
  行号: 15
  操作: 修改
  之前: wx.getUserInfo({
  之后: wx.getUserProfile({
  ```
- 告知用户记录位置，便于 AI 回滚

### Step 8 — 断开连接 + 打开 DevTools 供用户查看

```javascript
miniProgram.disconnect();
```

诊断完成后，保持 DevTools 运行并打开其窗口，让用户能直观看到模拟器状态、Console 面板等：
```powershell
cmd.exe /c "<CLI_PATH>" open --project <项目路径>
```
然后打印提示告知用户可以查看效果了。

**注意：不要 Stop-Process 杀掉 DevTools，保持运行供用户查看。**

---

## 诊断脚本结构（8 个模块）

| 模块 | 说明 |
|------|------|
| 页面遍历 | 遍历所有页面，验证导航正常 |
| 搜索功能 | 测试搜索框输入是否正常绑定 data |
| 元素存在性检查 | 验证核心组件已渲染 |
| 按钮交互与跳转 | 点击按钮，验证目标页面 |
| TabBar 切换 | 遍历所有 tab 页 |
| 表单输入 | input/textarea 输入 |
| 页面数据校验 | 检查 data 字段类型 |
| 滚动/下拉刷新 | 模拟 touch 手势 |

### 噪音分类引擎（16 条规则）

**噪音类（仅报告，不修复）：**
- 组件属性类型不匹配、框架日志
- setData 过大/频繁、Loading 频繁调用
- 插件/商业化日志

**可修复类（自动修复）：**
- `http://` → `https://`（跳过 mock 目录）
- `wx.getUserInfo` → 建议迁移
- `console.log/info/debug` → 建议删除
- `wx.show/hideNavigationBarLoading` → 建议迁移

---

## 技术约束

1. **`.bat` 文件必须用 `cmd.exe /c` 包装** — spawn() 不能直接运行 .bat
2. **非 tab 页面用 `redirectTo` 不用 `navigateTo`** — 后者撑爆页面栈
3. **`automator.on('console')` 捕获不全** — 框架级消息（`[system]`、`[Perf]`、`Error: timeout`）不可达，报告中已标注此限制
4. **搜索测试加 `evaluate()` 回退** — 当 `page.$('input')` 找不到时，直接 setData
5. **`switchTab`/`redirectTo` 必须加超时** — 用 `Promise.race` 包装，设置 15s 超时
6. **渲染层错误无法自动化捕获** — WXML/WXSS/数据绑定异常属于框架内部，报告中会注明
7. **原始 winston 日志文件** — 编译错误可查 DevTools 日志文件（路径见 Step 3）
8. **`page.$()` 无法选中 npm 自定义组件标签** — CSS 选择器引擎不支持 `t-*` 等 npm 包组件标签名。`testElementExists` 使用 **WXML class 扫描**替代 CSS 选择器：先获取 `pageEl.outerWxml()`，再用 `\b组件名\b` 正则匹配渲染 WXML 中的 CSS 类名。交互测试（tap/input）仍需选择器命中，会标记为失败。

---

## 触发条件

**此 skill 非显式调用不会自动激活。** 仅当用户明确提到以下内容时才加载：
- `/Wechat-Miniprogram-AI-Debug` 命令
- 微信小程序 / WeChat / miniprogram 相关的测试、诊断、优化
- 涉及 `E:\AI\wechatbot` 项目的自动化或调试
- 关键词：automator / DevTools / CLI / diagnose / 页面路由 / 搜索测试
- 用户明确要求 "用 Wechat-Miniprogram-AI-Debug" 或 "用这个 skill"

---

## 故障排查

### CLI 启动失败
- 检查微信开发者工具是否安装
- 确认 cli.bat 路径是否正确
- 尝试手动运行：`cmd.exe /c "<cli.bat完整路径>" auto --project <项目路径> --auto-port 9420`

### 连接超时
- 确认项目已成功编译（DevTools 无编译错误）
- 检查端口 9420 是否被占用
- 尝试重新启动 CLI

### 页面导航失败
- 检查 app.json 页面路径是否正确
- 确认页面 .wxml 文件存在
- 非 tab 页应使用 redirectTo，避免页面栈溢出

### 测试失败
- tdesign 等 npm 组件可能无法通过 CSS 选择器命中
- 使用 WXML class 扫描作为备选方案（见下方说明）
- 某些交互可能需要手动测试验证

---

## WXML class 扫描机制

`testElementExists` 使用 WXML class 扫描替代 `page.$()` 选择器检测 npm 自定义组件。这是因为 tdesign 等 npm 自定义组件在渲染层被展平为原生元素（`view`、`button` 等），其组件名以 CSS class 形式出现（例如 `<view class="t-tabs tabs--t-tabs ...">`）。

**扫描流程：**
1. 通过 `pageEl.outerWxml()` 获取页面完整 WXML
2. 用 `\b组件名\b` 正则匹配渲染 WXML 中的 CSS 类名
3. 匹配到则标记为 ✓，否则标记为 ✗

此方法可检测所有渲染的组件，但交互测试（`tap()`、`input()`）仍需 CSS 选择器命中，会标记为失败。
