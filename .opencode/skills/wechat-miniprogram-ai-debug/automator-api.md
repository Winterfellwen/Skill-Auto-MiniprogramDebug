# miniprogram-automator API 参考

基于微信官方文档精炼，供 AI 在诊断/修复时直接查阅。

---

## 1. Automator (入口)

### `automator.launch(options)` → `Promise<MiniProgram>`
启动开发者工具并连接。AI 用此方法启动项目。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cliPath` | string | 否 | cli.bat 绝对路径。默认 Win: `C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat` |
| `projectPath` | string | 是 | 项目绝对路径 |
| `timeout` | number | 否 | 启动最长等 30000ms |
| `port` | number | 否 | WebSocket 端口 |
| `projectConfig` | Object | 否 | 覆盖 `project.config.json` |

```js
const miniProgram = await automator.launch({
  cliPath: 'path/to/cli.bat',
  projectPath: 'path/to/project',
})
```

### `automator.connect(options)` → `Promise<MiniProgram>`
连接已运行的 DevTools。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `wsEndpoint` | string | 是 | `ws://localhost:9420` |

```js
const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
```

---

## 2. MiniProgram (小程序实例)

### 导航

| 方法 | 说明 | tabBar? |
|------|------|---------|
| `navigateTo(url)` → `Page` | 保留当前页，跳转 | 不支持 tab |
| `redirectTo(url)` → `Page` | 关闭当前页，跳转 | 不支持 tab |
| `switchTab(url)` → `Page` | 跳转 tabBar 页面 | **只能用于 tab** |
| `reLaunch(url)` → `Page` | 关闭所有页面，跳转 | 全部支持 |
| `navigateBack()` → `Page` | 返回上一页 | — |
| `currentPage()` → `Page` | 获取当前页面 | — |
| `pageStack()` → `Page[]` | 获取页面堆栈 | — |

> 页面路径统一以 `/` 开头：`/pages/home/index`

### 数据与拦截

| 方法 | 说明 |
|------|------|
| `systemInfo()` → `Object` | 获取系统信息（`wx.getSystemInfo`） |
| `callWxMethod(method, ...args)` → `any` | 调用 wx 对象方法 |
| `mockWxMethod(method, result\|fn)` | 覆盖 wx 方法返回结果 |
| `restoreWxMethod(method)` | 恢复 wx 原始方法 |
| `evaluate(fn, ...args)` → `any` | 往 AppService 注入代码并执行（fn 不可用闭包） |
| `pageScrollTo(scrollTop)` | 滚动页面到 px 位置 |
| `screenshot(options?)` → `string` | 截图，返回 base64（options 含 `path` 时保存到文件） |
| `exposeFunction(name, fn)` | 在 AppService 暴露全局方法 |
| `disconnect()` | 断开连接 |
| `close()` | 断开连接并关闭项目窗口 |

### 事件监听

```js
miniProgram.on('console', msg => {
  // msg.type: 'log'|'info'|'warn'|'error'|'assert'
  // msg.args: array<any>
})
miniProgram.on('exception', err => {
  // err.message, err.stack
})
```

---

## 3. Page (页面实例)

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `page.path` | string | 页面路径 |
| `page.query` | Object | 页面参数 |

### 方法

| 方法 | 说明 |
|------|------|
| `$(selector)` → `Element` | 获取第一个匹配元素（CSS 选择器，不支持自定义组件名如 `t-tabs`） |
| `$$(selector)` → `Element[]` | 获取所有匹配元素 |
| `waitFor(condition)` | 等（ms）/ 等（选择器出现）/ 等（函数返真） |
| `data(path?)` → `any` | 获取页面 data，`page.data('list')` 取特定路径 |
| `setData(data)` | 设置页面 data |
| `size()` → `{width, height}` | 页面可滚动宽高 |
| `scrollTop()` → `number` | 获取滚动位置 |
| `callMethod(method, ...args)` → `any` | 调用页面方法 |

### 元素查找注意
- CSS 选择器**不**支持 npm 自定义组件标签名（如 `t-tabs`、`t-button`）
- 自定义组件内的元素只能通过 `element.$()` 在元素范围内查找
- 替代方案：用 `pageEl.outerWxml()` 获取 WXML 源码，正则匹配 class 名

---

## 4. Element (元素实例)

### 属性

| 属性 | 说明 |
|------|------|
| `element.tagName` | 标签名（小写） |

### 查询

| 方法 | 说明 |
|------|------|
| `$(selector)` → `Element` | 在元素范围内查找 |
| `$$(selector)` → `Element[]` | 在元素范围内查找全部 |

### 读取

| 方法 | 说明 |
|------|------|
| `size()` → `{width, height}` | 元素宽高 |
| `offset()` → `{left, top}` | 元素绝对位置（左上角相对于页面原点） |
| `text()` → `string` | 元素文本 |
| `attribute(name)` → `string` | 标签特性值（如 `src`、`class`） |
| `property(name)` → `any` | 元素属性值（如 input 的 `value`） |
| `wxml()` → `string` | 元素内部 WXML |
| `outerWxml()` → `string` | 包含元素本身的 WXML |
| `value()` → `string` | 表单元素的值 |
| `style(name)` → `string` | 计算样式值 |

### 交互

| 方法 | 说明 |
|------|------|
| `tap()` | 点击 |
| `longpress()` | 长按 |
| `touchstart(options)` | 手指触摸 |
| `touchmove(options)` | 手指移动 |
| `touchend(options)` | 手指离开 |
| `trigger(type, detail?)` | 触发事件（不会触发 tap 等用户操作事件） |
| `input(value)` | 输入文本（仅 input/textarea） |

### 组件专用方法

| 方法 | 适用组件 | 说明 |
|------|----------|------|
| `callMethod(method, ...args)` | 自定义组件 | 调用组件方法 |
| `data(path?)` | 自定义组件 | 获取组件 data |
| `setData(data)` | 自定义组件 | 设置组件 data |
| `callContextMethod(method, ...args)` | video（需 id） | 调用 Context 方法 |
| `scrollWidth()` | scroll-view | 滚动宽度 |
| `scrollHeight()` | scroll-view | 滚动高度 |
| `scrollTo(x, y)` | scroll-view | 滚动到位置 |
| `swipeTo(index)` | swiper | 滑动到指定滑块 |
| `moveTo(x, y)` | movable-view | 移动视图容器 |
| `slideTo(value)` | slider | 滑动到指定数值 |

---

## 5. 常用模式

### 连接 + 事件监听 + 断开
```js
const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
const msgs = [], errs = []
miniProgram.on('console', m => msgs.push(m))
miniProgram.on('exception', e => errs.push(e))
// ... do work ...
miniProgram.disconnect()
```

### 页面导航 + 元素检测
```js
// tab 页
await miniProgram.switchTab('/pages/home/index')
// 非 tab 页
await miniProgram.redirectTo('/pages/detail/index')

const page = await miniProgram.currentPage()
const el = await page.$('.some-class')
if (el) {
  const wxml = await el.outerWxml()
  const txt = await el.text()
}
const data = await page.data('someField')
```

### 自定义组件检测（WXML 扫描法）
```js
const pageEl = await page.$('page')
const wxml = await pageEl.outerWxml()
const hasComponent = /\bt-tabs\b/.test(wxml) // true if class contains "t-tabs"
```

### 错误处理
```js
try {
  await miniProgram.navigateTo('/path/to/page')
} catch (e) {
  // 页面不存在或导航失败
}
```

### Mock 微信 API
```js
await miniProgram.mockWxMethod('showModal', { confirm: true, cancel: false })
await miniProgram.mockWxMethod('getSystemInfo', function(obj, platform) {
  return new Promise(resolve => {
    this.origin({ success(res) { res.platform = platform; resolve(res) } })
  })
}, 'test')
await miniProgram.restoreWxMethod('getSystemInfo')
```

---

## 6. 注意事项

1. **`.bat` 文件**：必须用 `cmd.exe /c` 包装运行，无法用 spawn 直接调用
2. **非 tab 页**：用 `redirectTo` 而非 `navigateTo`，避免页面栈溢出
3. **`switchTab`/`redirectTo`**：必须加超时保护（`Promise.race` + 15s 超时）
4. **`page.$()` 局限性**：无法选中 npm 自定义组件标签（如 `t-tabs`），改用 WXML class 扫描
5. **`console` 事件捕获不完全**：框架级消息（`[system]`、`[Perf]`、`Error: timeout`）不可达
6. **渲染层错误无法自动化捕获**：WXML/WXSS/数据绑定异常属于框架内部
7. **编译错误**：可查 DevTools 日志 `%USERPROFILE%\AppData\Local\微信开发者工具\User Data\*\WeappLog\logs\*.log`
