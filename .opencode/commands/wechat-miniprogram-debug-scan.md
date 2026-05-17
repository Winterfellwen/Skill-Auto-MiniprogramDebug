---
description: Scan a WeChat miniprogram project for issues without modifying code
---

Scan a WeChat miniprogram for bugs, warnings, and issues. Report only — do NOT modify source files.

**Critical: All automator API calls must use `node -e "..."` directly. Do NOT write any .js script files for automator.**

Project path: $ARGUMENTS

## Step 1 — Path correction
Run `Test-Path <path>\app.json` to verify. If it fails, try swapping drive letter C: ↔ E: and retry. If still missing, ask user to confirm.

## Step 2 — SDK check
Check `node_modules/miniprogram-automator`. If absent, run `npm install miniprogram-automator --save-dev`.  
Remind user: **manually enable "服务端口" in WeChat DevTools → Settings → Security**.

## Step 3 — Kill residual processes
```powershell
Get-Process -Name "wechatdevtools","微信开发者工具*" -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Step 4 — Start DevTools automation
1. Read `app.json`, collect all page paths (including subpackages), check for duplicates and missing `.wxml`
2. **Auto-find cli.bat**: try each in order until found:
   - `C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
   - `D:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
   - `E:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
   - `F:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat`
   - If still not found, ask user for the path
3. Check port: run `<cli.bat> isportavailable --port 9420`; if `disabled`, ask user to enable
4. Start:
   ```
   cmd.exe /c "<cli.bat>" auto --project <project> --auto-port 9420
   ```
   Wait for `√ auto` in output.
5. Connect via `node -e`:
   ```js
   const a=require('miniprogram-automator');(async()=>{const m=await a.connect({wsEndpoint:'ws://localhost:9420'});/* ready */})()
   ```
6. Verify: `miniProgram.currentPage()` with 8s timeout. On failure, check DevTools logs:
   ```
   Get-ChildItem "$env:USERPROFILE\AppData\Local\微信开发者工具\User Data\*\WeappLog\logs\*.log" | Sort LastWriteTime -Descending | Select -First 1 | Get-Content -Encoding UTF8 | Select-String "\[ERROR\]"
   ```
   Fix and retry from Step 3.

## Step 5 — Event listeners
```js
miniProgram.on('console', msg => logs.push(msg))
miniProgram.on('exception', err => logs.push(err))
```

## Step 6 — Page traversal (AI decides order)
Recommended strategy:
- **tabBar pages**: `switchTab` → `currentPage()` → `page.outerWxml()` → `page.data()` → `page.$$(selector)`
- **Non-tab pages**: `redirectTo` (prevent stack overflow) → same analysis
- **Search pages**: `page.$('input')` → `.input('test')` → `page.data('searchValue')`
- **Form pages**: find inputs/textarea → fill test data
- **Scroll pages**: find `scroll-view` → try touch gestures
- **Deep nav**: click list items → navigate to detail pages
All navigation: `Promise.race([navigate, new Promise((_,r)=>setTimeout(r,15000))])`

## Step 7 — Classify captured messages
Severity: `noise` (non-functional) / `fixable` (needs fix) / `unknown` (manual check).

Known noise: component prop type mismatch, framework logs, internal component warnings, excessive/large setData, frequent Loading, plugin logs.

Known fixable: `http://` → `https://`, `wx.getUserInfo`, `console.log/info/debug`, `wx.show/hideNavigationBarLoading`, reference errors, resource load failures, script exceptions, route exceptions.

## Step 8 — Output reports
- `diagnose-report.txt`: page status + error classification + noise list
- `diagnose-fix-suggestions.txt`: file path + line + suggestion + reason

## Step 9 — Disconnect & keep DevTools open
```js
miniProgram.disconnect()
```
```
cmd.exe /c "<CLI_PATH>" open --project <project>
```
