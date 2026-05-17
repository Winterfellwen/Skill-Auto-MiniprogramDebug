---
name: wechat-miniprogram-ai-debug
description: 微信小程序自动化诊断。AI 直接用 miniprogram-automator API 驱动 DevTools，分扫描/修复两种模式。
license: MIT
compatibility: opencode, claude code
metadata:
  platform: windows
  tooling: miniprogram-automator
  node: ">=18"
---

# ⚠️ 关键执行规则 — 必须先读

1. **禁止用 diagnose.js 脚本跑 miniprogram-automator**。所有 automator API 调用（connect、导航、元素查询、事件监听）必须由 AI 在当前会话中用 `node -e "..."` 直接执行，不能写成脚本文件再跑。
2. **修改项目源码不受限**。修复模式下的编辑项目 `.js`/`.wxml`/`.wxss` 等文件，可以直接 edit 或写脚本处理，随意。
3. 通过 `child_process` 启动 CLI，用 `automator.connect()` 连接。
4. 完整 API 参考见同目录下 [`automator-api.md`](automator-api.md)。

# 调用方式

```
/wechat-miniprogram-debug-scan <项目路径>
/wechat-miniprogram-debug-fix <项目路径>
```

**此 skill 不会自动激活。** 必须通过 `/wechat-miniprogram-debug-scan` 或 `/wechat-miniprogram-debug-fix` 才会加载。

# 通用流程（Scan / Fix 共用）

## Step 1 — 路径修正

- 自动纠正盘符（C: ↔ E:）
- `Test-Path <项目路径>\app.json` 验证存在
- 不存在则提示用户确认

## Step 2 — 检测并安装 SDK

检查 `package.json` 和 `node_modules/miniprogram-automator`，未安装则 `npm install miniprogram-automator --save-dev`。
提示用户：**必须手动开启微信开发者工具"服务端口"**（设置 → 安全设置 → CLI/HTTP 调用功能）。

## Step 3 — 清理残留进程

```powershell
Get-Process -Name "wechatdevtools","微信开发者工具*" -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Step 4 — 启动 DevTools 自动化服务

1. **验证 app.json**：读取页面列表（含 subpackages），检查重复路径和缺失 `.wxml`
2. **查找 cli.bat**：`C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`，不存在则检查 D:、E:、F:
3. **检测端口**：执行 CLI，若返回 `IDE service port disabled` 则提示用户手动开启
4. **启动**：
   ```
   cmd.exe /c "<cli.bat路径>" auto --project <项目路径> --auto-port 9420
   ```
   等输出 `√ auto`
5. **Node.js 直接连接**（用 node -e，不写 diagnose.js）：
   ```js
   const automator = require('miniprogram-automator')
   const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
   ```
6. **校验编译**：`miniProgram.currentPage()` 加 8s 超时，失败则查 DevTools 日志：
   ```
   Get-ChildItem "$env:USERPROFILE\AppData\Local\微信开发者工具\User Data\*\WeappLog\logs\*.log" | Sort LastWriteTime -Descending | Select -First 1 | Get-Content -Encoding UTF8 | Select-String "\[ERROR\]"
   ```
   修复后从 Step 3 重试。

## Step 5 — 事件监听

```js
const logs = []
miniProgram.on('console', msg => logs.push(msg))
miniProgram.on('exception', err => logs.push(err))
```

# Scan 模式

**automator API 调用用 node -e 直接执行，不写 diagnose.js 脚本。**

## Scan 1 — 读取页面结构

```powershell
$json = Get-Content <项目路径>\app.json -Raw | ConvertFrom-Json
# 收集所有页面路径，标记 tabBar 和搜索页
```

## Scan 2 — AI 遍历页面（自主决定顺序）

推荐策略：
1. **tabBar 页**：`switchTab` → `currentPage()` → `page.outerWxml()` 获取 WXML → `page.data()` 获取数据 → `page.$$(selector)` 检测元素
2. **非 tab 页**：`redirectTo` → 同上分析
3. **搜索页**：`page.$('input')` 找到输入框 → `.input('test')` → `page.data('searchValue')` 验证绑定
4. **表单页**：找到 `input`/`textarea` → 填入测试数据
5. **滚动页**：找到 `scroll-view` → 尝试 touch 手势
6. **深度交互**：点击列表项查看详情页

> 所有导航加超时保护：`Promise.race([navigate, timeout(15000)])`

## Scan 3 — 分类捕获消息

按严重度分类：`noise`（不影响功能）/ `fixable`（需要修复）/ `unknown`（需人工判断）

已知噪音：组件属性类型不匹配、框架日志、组件内部警告、setData 过大/频繁、Loading 频繁、插件日志

已知可修复：`http://`→`https://`、`wx.getUserInfo`、`console.log/info/debug`、`wx.show/hideNavigationBarLoading`、引用错误、资源加载失败、脚本异常、路由异常

## Scan 4 — 输出诊断报告

生成 `diagnose-report.txt`（页面状态 + 错误分类 + 噪音列表）和 `diagnose-fix-suggestions.txt`（文件路径+行号+修改建议+原因）。

## Scan 5 — 断开 + 保持 DevTools

```js
miniProgram.disconnect()
```
```
cmd.exe /c "<CLI_PATH>" open --project <项目路径>
```

# Fix 模式

Scan 1-3 同 Scan。然后：

## Fix 4 — 自动修复

**先备份**：
```
$backupDir = "<项目路径>_backup_$(Get-Date -Format yyyyMMddHHmmss)"
New-Item -Type Directory $backupDir
Copy-Item "<项目路径>\pages","<项目路径>\app.json","<项目路径>\app.js","<项目路径>\app.wxss","<项目路径>\project.config.json" $backupDir -Recurse
```

**然后逐项修复**：AI 直接 edit 源码文件（或写辅助脚本处理都行）。规则：
- `http://`（非 localhost/127.0.0.1/10.）→ `https://`
- `console.log(` / `console.info(` / `console.debug(` → 删除整行
- `wx.showNavigationBarLoading(` / `wx.hideNavigationBarLoading(` → 删除整行
- 引用错误 → 尝试添加声明
- **不修**：node_modules、miniprogram_npm、mock 目录

## Fix 5 — 生成修复记录

`diagnose-fix-log.txt`：文件路径 + 行号 + 操作类型 + 修改前 + 修改后 + 原因

## Fix 6 — 断开 + 保持 DevTools

同 Scan。

# 技术约束

1. **`.bat`**必须 `cmd.exe /c` 包装
2. **非 tab 页**用 `redirectTo`（防页面栈溢出）
3. **`switchTab`/`redirectTo`** 加 `Promise.race` + 15s 超时
4. **`page.$()` 无法选中 npm 组件标签**（如 `t-tabs`），改用 `outerWxml()` + `\b组件名\b` 正则
5. **`console` 事件捕获不全**：框架级消息不可达，报告需注明
6. **渲染层错误无法捕获**：WXML/WXSS 异常，报告需注明
7. **编译错误**查 DevTools 日志：`%USERPROFILE%\AppData\Local\微信开发者工具\User Data\*\WeappLog\logs\*.log`

# 故障排查

- CLI 启动失败 → 确认开发者工具已安装，检查 cli.bat 路径，手动运行测试
- 连接超时 → 检查编译错误、端口 9420 被占用、从 Step 3 重试
- 页面导航失败 → 检查 app.json 路径、wxml 存在、用正确导航方式
- WXML 找不到元素 → npm 组件用 `outerWxml()` 正则匹配
