<p align="center">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug"><img src="https://img.shields.io/github/v/release/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=for-the-badge&color=blue" alt="GitHub Release"></a>
  <img src="https://img.shields.io/badge/微信小程序-07C160?style=for-the-badge&logo=wechat&logoColor=white" alt="微信小程序">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node 18+">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/Winterfellwen/Wechat-Miniprogram-AI-Debug/stargazers"><img src="https://img.shields.io/github/stars/Winterfellwen/Wechat-Miniprogram-AI-Debug?style=flat-square&logo=github" alt="GitHub stars"></a>
  <img src="https://img.shields.io/badge/OpenCode-兼容-6366f1?style=flat-square" alt="OpenCode">
  <img src="https://img.shields.io/badge/Claude%20Code-兼容-6366f1?style=flat-square" alt="Claude Code">
  <img src="https://img.shields.io/badge/平台-Windows-0078D4?style=flat-square" alt="Windows">
</p>

<h1 align="center">WeChat Miniprogram AI Debug</h1>

<p align="center">
  基于 <code>miniprogram-automator</code> 的微信小程序自动化测试 skill。<br>
  AI 自动驱动 DevTools CLI，遍历页面、测试搜索交互、点击按钮、捕获 console 错误和 JS 异常。
</p>

---

## 功能

AI 代理被调用后，自动完成以下操作：

1. 启动微信开发者工具自动化服务
2. 通过 WebSocket 连接
3. 遍历所有已注册的页面路由
4. 测试搜索输入交互
5. 点击按钮并验证页面状态
6. 捕获 console 错误和 JS 异常
7. 输出结构化诊断报告

**注意：此 skill 非显式调用不会自动激活。必须通过 `/Wechat-Miniprogram-AI-Debug` 命令或用户明确提及才加载。**

---

## 安装

将 `Wechat-Miniprogram-AI-Debug/` 放入以下任意目录：

| 路径 | 作用域 |
|------|--------|
| `.opencode/skills/<name>/` | 项目 |
| `~/.config/opencode/skills/<name>/` | 全局 |
| `.claude/skills/<name>/` | 项目（Claude） |
| `~/.claude/skills/<name>/` | 全局（Claude） |
| `.agents/skills/<name>/` | 项目（Agent） |
| `~/.agents/skills/<name>/` | 全局（Agent） |

---

## 使用

### 斜杠命令

```
/Wechat-Miniprogram-AI-Debug [自定义指令]
```

### 示例

```
帮我调试 E:\AI\wechatbot 这个项目
用 automator 测试 all pages
帮我测试 pdf 转换功能
```

### 命令行参数

诊断脚本 `tests/diagnose.js` 支持以下参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--project <path>` | 项目路径 | 自动从 Skill 传入 |
| `--cli <path>` | cli.bat 路径 | 自动从 Skill 传入 |
| `--port <port>` | 自动化服务端口 | `9420` |
| `--scan-only` | 仅扫描，不修复 | `true`（默认） |
| `--max-retries <n>` | 最大重试次数 | `1` |
| `--timeout <ms>` | 页面导航超时 | `15000` |

### 输出文件

诊断完成后会在项目目录生成：

| 文件 | 说明 |
|------|------|
| `diagnose-report.json` | 完整 JSON 报告 |
| `diagnose-report.txt` | 人类可读的文本报告 |
| `diagnose-fix-suggestions.txt` | **修复方案**（扫描模式），包含具体文件路径+行号+修改内容 |
| `diagnose-fix-log.txt` | **修复记录**（修复模式），包含操作类型（增加/删除/修改）+ 具体变更 |

---

## 诊断模块

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

---

## 案例：`E:\AI\wechatbot - 副本 (2)` 实际扫描结果

2026-05-13 对该项目（27 页、2 个 tab）执行全量扫描，**所有 8 个模块完整输出**：

| 模块 | 结果 | 说明 |
|------|------|------|
| 页面遍历 | 27/27 ✅ | 全部页面导航正常 |
| 搜索功能 | 0/2 ⚠️ | input 找到但 searchKey 绑定问题 |
| 元素存在性检查 | 20/27 ⚠️ | 部分页面无特殊组件标签 |
| 按钮交互与跳转 | 0/6 ⚠️ | 按钮 bindtap 模式需适配 |
| TabBar 切换 | 2/2 ✅ | 两个 tab 全部正常 |
| 表单输入 | 5/9 ⚠️ | 部分页面无输入框 |
| 页面数据校验 | ✅ (跳过) | 未配置 data_checks |
| 滚动/下拉刷新 | 12/13 ⚠️ | touch 模拟在 scroll-view 不稳定 |

Console errors: **0** · Console warnings: **0** · JS 异常: **0**

> 部分模块的失败属于预期行为（项目以基础组件为主，无 tdesign 等复杂 npm 组件），不影响核心功能验证。

---

## 故障排查

### CLI 启动失败
- 确认微信开发者工具已安装
- 检查 cli.bat 路径是否正确
- 尝试手动运行：
  ```cmd
  "C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" auto --project <项目路径> --auto-port 9420
  ```

### 连接超时
- 检查项目是否有编译错误
- 确认端口 9420 未被占用
- 尝试重启开发者工具

### 页面导航失败
- 检查 `app.json` 页面路径是否正确
- 确认页面 `.wxml` 文件存在
- 非 tab 页应使用 `redirectTo`，避免页面栈溢出

---

## 文件说明

| 路径 | 说明 |
|------|------|
| `SKILL.md` | Skill 定义和 AI 行为规则 |
| `templates/diagnose.js` | 诊断脚本模板 |

---

## License

MIT