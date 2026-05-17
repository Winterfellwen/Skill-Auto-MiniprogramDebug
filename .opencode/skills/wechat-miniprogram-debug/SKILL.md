---
name: wechat-miniprogram-debug
description: 微信小程序自动化诊断。AI 直接用 miniprogram-automator API 驱动 DevTools，扫描问题或自动修复。
license: MIT
compatibility: opencode
metadata:
  platform: windows
  tooling: miniprogram-automator
---

# 关键规则

1. **禁止写 diagnose.js 脚本**。所有 automator API 调用（connect、导航、元素查询、事件监听）用 `node -e "..."` 直接执行。
2. **修改项目源码不受限**。修复模式下直接 edit `.js`/`.wxml`/`.wxss` 等。
3. 通过 `child_process` 启动 CLI，用 `automator.connect()` 连接。
4. 完整 API 参考见同目录下 [`automator-api.md`](automator-api.md)。

# 通用流程

## 路径修正
- 自动纠正盘符（C: ↔ E:）
- `Test-Path <项目路径>\app.json` 验证，不存在则提示用户

## SDK 检测
- 检查 `package.json` 和 `node_modules/miniprogram-automator`
- 未安装则 `npm install miniprogram-automator --save-dev`
- 提示用户：**手动开启"服务端口"**（设置 → 安全设置 → CLI/HTTP 调用）

## 清理残留进程
```powershell
Get-Process -Name "wechatdevtools","微信开发者工具*" -ErrorAction SilentlyContinue | Stop-Process -Force
```

## 启动 DevTools

1. **验证 app.json**：读取页面列表（含 subpackages），检查重复路径和缺失 `.wxml`
2. **查找 cli.bat**：
   - 先检查 `C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
   - 不存在则用 PowerShell 枚举所有盘符：`Get-PSDrive -PSProvider FileSystem | Select-Object Root`
   - 遍历每个盘符检查 `$($driveRoot)Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
   - 都找不到再问用户安装路径
3. **检测端口**：`<cli.bat> isportavailable --port 9420`，返回 `disabled` 则提示用户开启
4. **启动**：
   ```
   cmd.exe /c "<cli.bat>" auto --project <项目路径> --auto-port 9420
   ```
   等待输出 `√ auto`
5. **连接**（`node -e`）：
   ```js
   const a=require('miniprogram-automator');(async()=>{const m=await a.connect({wsEndpoint:'ws://localhost:9420'});/* ready */})()
   ```
6. **校验**：`miniProgram.currentPage()` 加 8s 超时，失败则查 DevTools 日志：
   ```
   Get-ChildItem "$env:USERPROFILE\AppData\Local\微信开发者工具\User Data\*\WeappLog\logs\*.log" | Sort LastWriteTime -Descending | Select -First 1 | Get-Content -Encoding UTF8 | Select-String "\[ERROR\]"
   ```
   修复后从清理步骤重试。

## 事件监听
```js
const logs = []
miniProgram.on('console', msg => logs.push(msg))
miniProgram.on('exception', err => logs.push(err))
```

# 页面遍历（AI 自主决定顺序）

推荐策略：
- **tabBar 页**：`switchTab` → `currentPage()` → `page.outerWxml()` → `page.data()` → `page.$$(selector)`
- **非 tab 页**：`redirectTo`（防栈溢出）→ 同上分析
- **搜索页**：`page.$('input')` → `.input('test')` → `page.data('searchValue')`
- **表单页**：找 `input`/`textarea` → 填入测试数据
- **滚动页**：找 `scroll-view` → 尝试 touch 手势
- **深度交互**：点击列表项查看详情页

所有导航：`Promise.race([navigate, new Promise((_,r)=>setTimeout(r,15000))])`

# Scan 模式
1. 遍历页面，分类捕获消息：`noise`（不影响）/ `fixable`（可修）/ `unknown`（需人工）
2. 已知噪音：组件属性类型不匹配、框架日志、组件内部警告、setData 过大/频繁、Loading 频繁、插件日志
3. 已知可修：`http://`→`https://`、`wx.getUserInfo`、`console.log/info/debug`、`wx.show/hideNavigationBarLoading`、引用错误、资源加载失败、脚本异常、路由异常
4. 输出 `diagnose-report.txt`（页面状态 + 错误分类 + 噪音列表）和 `diagnose-fix-suggestions.txt`（文件路径+行号+修改建议+原因）
5. `miniProgram.disconnect()`，然后 `cmd.exe /c "<CLI_PATH>" open --project <项目路径>`

# Fix 模式
1. 扫描同 Scan
2. **先备份**：
   ```powershell
   $backupDir = "<项目路径>_backup_$(Get-Date -Format yyyyMMddHHmmss)"
   New-Item -Type Directory $backupDir
   Copy-Item "<项目路径>\pages","<项目路径>\app.json","<项目路径>\app.js","<项目路径>\app.wxss","<项目路径>\project.config.json" $backupDir -Recurse
   ```
3. **自动修复**：AI 直接 edit 源码。规则：
   - `http://`（非 localhost/127.0.0.1/10.）→ `https://`
   - `console.log(` / `console.info(` / `console.debug(` → 删除整行
   - `wx.showNavigationBarLoading(` / `wx.hideNavigationBarLoading(` → 删除整行
   - 引用错误 → 尝试添加声明
   - **不修**：node_modules、miniprogram_npm、mock
4. 生成 `diagnose-fix-log.txt`（文件路径 + 行号 + 操作 + 修改前/后 + 原因）
5. 断开 + 保持 DevTools

# 技术约束
1. `.bat` 必须 `cmd.exe /c` 包装
2. 非 tab 页用 `redirectTo`（防栈溢出）
3. `switchTab`/`redirectTo` 加 `Promise.race` + 15s 超时
4. `page.$()` 无法选 npm 组件标签（如 `t-tabs`），改用 `outerWxml()` + 正则
5. `console` 事件捕获不全，报告需注明
6. 渲染层错误无法捕获，报告需注明
7. 编译错误查 DevTools 日志

# 故障排查
- CLI 启动失败 → 确认开发者工具已安装、检查 cli.bat 路径
- 连接超时 → 检查编译错误、端口 9420 被占用、从清理步骤重试
- 页面导航失败 → 检查 app.json 路径、wxml 是否存在
- WXML 找不到元素 → npm 组件用 `outerWxml()` 正则
