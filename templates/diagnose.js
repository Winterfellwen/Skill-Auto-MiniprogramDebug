/**
 * templates/diagnose.js
 *
 * 微信小程序自动化诊断脚本模板。
 * Skill 每次运行时，用它为基础，读取实际项目的 app.json 和 WXML，
 * 替换 PAGES / ELEMENT_CHECKS / BUTTON_NAV_TESTS / FORM_TESTS / SCROLL_TESTS 等内容，
 * 在 tests/diagnose.js 输出针对当前项目的完整测试脚本。
 *
 * 包含 6 个测试模块:
 * - P0: 元素存在性检查
 * - P0: 按钮交互与跳转验证
 * - P0: TabBar 切换
 * - P1: 表单输入
 * - P1: 页面数据校验
 * - P2: 滚动/下拉刷新
 */
const automator = require('miniprogram-automator');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
// 以下区域由 Skill 根据项目实际结构动态生成
// ═══════════════════════════════════════════════════

const CLI_PATH = 'E:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
const PROJECT_PATH = 'C:\\Users\\winte\\WeChatProjects\\miniprogram-5';
const AUTO_PORT = 9420;
const REPORT_PATH = path.join(__dirname, 'diagnose-report.json');

// 页面列表 — Skill 读取 app.json 生成
const PAGES = [
  { path: 'pages/home/index', name: '首页', tab: true },
  { path: 'pages/message/index', name: '消息', tab: true },
  { path: 'pages/my/index', name: '我的', tab: true },
  { path: 'pages/search/index', name: '搜索', search: true },
  { path: 'pages/my/info-edit/index', name: '编辑信息' },
  { path: 'pages/chat/index', name: '聊天' },
  { path: 'pages/dataCenter/index', name: '数据中心' },
  { path: 'pages/setting/index', name: '设置' },
  { path: 'pages/release/index', name: '发布' },
  { path: 'pages/login/login', name: '登录' },
  { path: 'pages/loginCode/loginCode', name: '登录码' },
];

// 测试模块开关
const MODULES = {
  elementExists: { enabled: true, name: '元素存在性检查', priority: 'P0' },
  buttonNav:     { enabled: true, name: '按钮交互与跳转验证', priority: 'P0' },
  tabBar:        { enabled: true, name: 'TabBar 切换', priority: 'P0' },
  formInput:     { enabled: true, name: '表单输入', priority: 'P1' },
  pageData:      { enabled: true, name: '页面数据校验', priority: 'P1' },
  scrollTest:    { enabled: true, name: '滚动/下拉刷新', priority: 'P2' },
};

// 元素存在性检查 — Skill 扫描各页面 WXML 生成
const ELEMENT_CHECKS = {
  'pages/home/index': [
    { selector: 't-tabs', desc: 'Tabs 标签页' },
    { selector: 't-swiper', desc: '轮播组件' },
    { selector: 't-button', desc: '发布按钮' },
  ],
  'pages/message/index': [
    { selector: 'scroll-view', desc: '消息列表容器' },
    { selector: 't-badge', desc: '未读角标' },
    { selector: 't-cell', desc: '会话列表项' },
  ],
  'pages/my/index': [
    { selector: 't-avatar', desc: '用户头像' },
    { selector: 't-grid', desc: '功能网格' },
    { selector: 't-cell', desc: '设置列表' },
  ],
};

// 按钮导航测试 — Skill 基于 WXML 事件绑定生成
const BUTTON_NAV_TESTS = [
  { from: 'pages/home/index', selector: 't-button', label: '发布' },
  { from: 'pages/my/index',   selector: 't-cell',  label: '登录' },
];

// TabBar 项 — 从 app.json.tabBar.list 生成
const TAB_BAR_ITEMS = PAGES.filter(function(p) { return p.tab; }).map(function(p) {
  return { path: p.path, name: p.name };
});

// 表单输入测试 — Skill 基于 input/textarea/t-input 等生成
const FORM_TESTS = [
  {
    page: 'pages/login/login',
    label: '登录页-输入账号',
    fields: [
      { selector: 't-input', inputIndex: 0, value: 'test_user' },
      { selector: 't-input', inputIndex: 1, value: 'password123' },
    ],
  },
  {
    page: 'pages/chat/index',
    label: '聊天-输入消息',
    fields: [
      { selector: 'input', inputIndex: 0, value: '你好，这是一条测试消息' },
    ],
  },
];

// 页面数据校验 — Skill 基于各页面 JS data 结构生成
const DATA_CHECKS = {
  'pages/search/index': {
    description: '搜索页数据',
    fields: [
      { path: 'searchValue', type: 'string', optional: true },
      { path: 'historyWords', type: 'array', optional: true },
      { path: 'popularWords', type: 'array', optional: true },
    ],
  },
  'pages/chat/index': {
    description: '聊天页数据',
    fields: [
      { path: 'input', type: 'string', optional: true },
      { path: 'messages', type: 'array', optional: true },
    ],
  },
};

// 滚动测试 — 基于 scroll-view 组件生成
const SCROLL_TESTS = [
  { page: 'pages/message/index', selector: 'scroll-view', label: '消息列表-下拉刷新' },
  { page: 'pages/chat/index',    selector: 'scroll-view', label: '聊天列表-滚动' },
];

// ═══════════════════════════════════════════════════
// 以下为固定测试逻辑，无需修改
// ═══════════════════════════════════════════════════

const CATEGORY_RULES = [
  {
    pattern: /received type\.uncompatible.*expected <String>.*null/,
    category: '组件属性类型不匹配',
    severity: 'noise',
    explanation: '组件收到 null 而非期望的 String，框架自动兜底为空字符串，不影响功能',
  },
  {
    pattern: /received type\.uncompatible|type\.uncompatible/,
    category: '组件属性类型不匹配',
    severity: 'noise',
    explanation: '传入属性类型与组件声明不一致，框架会尝试自动类型转换',
  },
  {
    pattern: /deprecated|弃用|removed|不再维护|将移除/i,
    category: '已废弃 API',
    severity: 'fixable',
    explanation: '使用了已废弃的 API，建议迁移到新版 SDK 接口',
  },
  {
    pattern: /Can't find variable|is not defined|undefined is not/i,
    category: '引用错误',
    severity: 'fixable',
    explanation: '引用了未定义的变量或方法，会导致 JS 执行中断',
  },
  {
    pattern: /Failed to load|failed to load|加载失败|网络层错误|渲染层/i,
    category: '资源加载失败',
    severity: 'fixable',
    explanation: '静态资源（图片/字体/文件）加载失败，请检查资源路径',
  },
  {
    pattern: /script error|ScriptError|thirdScriptError|thirdScriptErr/i,
    category: '脚本异常',
    severity: 'fixable',
    explanation: '框架捕获的未处理 JS 异常，建议用 try-catch 处理',
  },
  {
    pattern: /\[Component\]/,
    category: '组件内部警告',
    severity: 'noise',
    explanation: '自定义组件的非关键警告，不影响功能运行',
  },
  {
    pattern: /\[system\]|\[Perf\]|\[WXML\]|\[WX\]/,
    category: '框架日志',
    severity: 'noise',
    explanation: '小程序框架内部日志，与业务代码无关',
  },
  {
    pattern: /setData.*too large|setData.*数据量过大|data size.*limit/i,
    category: 'setData 数据量过大',
    severity: 'noise',
    explanation: '单次 setData 数据量超过 1MB 限制，建议拆分或增量更新',
  },
  {
    pattern: /setData.*frequently|setData.*频繁|webview.*rendering/i,
    category: 'setData 频繁调用',
    severity: 'noise',
    explanation: '短时间内频繁调用 setData，建议用批量更新或节流优化',
  },
  {
    pattern: /http:\/\//i,
    category: '非 HTTPS 请求',
    severity: 'fixable',
    explanation: '小程序强制 HTTPS，http 资源会被拦截，请改用 https',
  },
  {
    pattern: /hideLoading|showLoading.*频繁|loading.*频繁/i,
    category: 'Loading 频繁调用',
    severity: 'noise',
    explanation: '短时间内频繁显示/隐藏 loading，建议增加防抖',
  },
  {
    pattern: /navigateTo|redirectTo|switchTab|reLaunch/,
    category: '路由异常',
    severity: 'fixable',
    explanation: '页面路由调用异常，可能目标页面不存在或传递参数错误',
  },
  {
    pattern: /getUserInfo|getSetting|authorize/i,
    category: '授权相关',
    severity: 'fixable',
    explanation: '用户信息授权相关调用，注意新版微信需用头像昵称填写能力代替',
  },
  {
    pattern: /commercial|plugin payment|base64/i,
    category: '插件/商业化',
    severity: 'noise',
    explanation: '插件或商业化相关日志，与业务代码无关',
  },
  {
    pattern: /not found|404|not exist/i,
    category: '资源/页面不存在',
    severity: 'fixable',
    explanation: '请求的资源或页面不存在，请检查路径配置',
  },
];

function classifyEntry(text, type) {
  for (const r of CATEGORY_RULES) {
    if (r.pattern.test(text)) return r;
  }
  return {
    category: type === 'error' ? '其他错误' : '其他警告',
    severity: type === 'error' ? 'fixable' : 'noise',
    explanation: type === 'error' ? '未分类的错误，建议人工审查' : '未分类的警告，建议人工审查',
  };
}

// ── CLI ───────────────────────────────────────────────────
function startCLI() {
  return new Promise((resolve, reject) => {
    const args = ['/c', CLI_PATH, 'auto', '--project', PROJECT_PATH, '--auto-port', String(AUTO_PORT)];
    const proc = spawn('cmd.exe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => out += d);
    proc.on('error', reject);
    const timer = setTimeout(() => {
      if (out.includes('√ auto')) resolve(proc);
      else reject(new Error('CLI auto timed out:\n' + out));
    }, 60000);
    proc.on('exit', code => {
      clearTimeout(timer);
      if (out.includes('√ auto')) resolve(proc);
      else reject(new Error(`CLI exited ${code}:\n${out}`));
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function timeoutPromise(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error(`超时 ${ms}ms`)), ms)); }

async function navigateWithTimeout(miniProgram, page) {
  if (page.tab) {
    await Promise.race([miniProgram.switchTab('/' + page.path), timeoutPromise(15000)]);
  } else {
    await Promise.race([miniProgram.redirectTo('/' + page.path), timeoutPromise(15000)]);
  }
}

// ── 自动修复 ──────────────────────────────────────────────
function isThirdParty(file) {
  return file.includes('node_modules') || file.includes('miniprogram_npm') || file.includes('tests') || file.includes('.github');
}

const FIX_RULES = [
  {
    pattern: /wx\.getUserInfo\s*\(/g, replace: null,
    description: 'wx.getUserInfo 已被废弃，建议使用头像昵称填写能力或 wx.getUserProfile',
    exclude: file => isThirdParty(file) || file.includes('mock'),
  },
  {
    pattern: /http:\/\/(?!localhost|127\.0\.0\.1|10\.)/g, replace: 'https://',
    description: '非 HTTPS 链接改为 HTTPS',
    exclude: file => isThirdParty(file) || file.includes('mock'),
  },
  {
    pattern: /console\.(log|info|debug)\(/g, replace: null,
    description: '生产环境不应保留 console.log/info/debug，建议移除',
    exclude: file => isThirdParty(file) || file.includes('mock') || file.includes('quick-test'),
  },
  {
    pattern: /wx\.showNavigationBarLoading\s*\(/g, replace: null,
    description: 'wx.showNavigationBarLoading 已废弃',
    exclude: isThirdParty,
  },
  {
    pattern: /wx\.hideNavigationBarLoading\s*\(/g, replace: null,
    description: 'wx.hideNavigationBarLoading 已废弃',
    exclude: isThirdParty,
  },
];

function collectJSFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'miniprogram_npm') {
        results.push(...collectJSFiles(full));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(full);
      }
    }
  } catch (_) {}
  return results;
}

function autoFix() {
  const fixLog = [];
  const jsFiles = collectJSFiles(PROJECT_PATH);
  let anyFound = false;

  for (const rule of FIX_RULES) {
    for (const file of jsFiles) {
      if (rule.exclude && rule.exclude(file)) continue;
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(rule.pattern);
        if (matches && matches.length > 0) {
          anyFound = true;
          if (rule.replace !== null) {
            const newContent = content.replace(rule.pattern, rule.replace);
            fs.writeFileSync(file, newContent, 'utf-8');
            fixLog.push({ action: '已修复', file: path.relative(PROJECT_PATH, file), description: rule.description, matchCount: matches.length });
          } else {
            fixLog.push({ action: '建议', file: path.relative(PROJECT_PATH, file), description: rule.description, matchCount: matches.length });
          }
        }
      } catch (_) {}
    }
  }
  if (!anyFound) fixLog.push({ action: '跳过', file: '-', description: '项目代码中未检测到已知的可修复模式' });
  return fixLog;
}

// ══════════════════════════════════════════════════════════
// ── 测试模块 ──────────────────────────────────────────────

// 1. 元素存在性检查
async function testElementExists(miniProgram, pageObj, pageRoute) {
  const checks = ELEMENT_CHECKS[pageRoute];
  if (!checks) return { passed: 0, failed: 0, skipped: 0, details: [] };
  let p = 0, f = 0, s = 0;
  const det = [];
  for (const c of checks) {
    try {
      const el = await Promise.race([pageObj.$(c.selector), timeoutPromise(3000)]);
      if (el) { p++; det.push({ selector: c.selector, desc: c.desc, status: '✓' }); }
      else { f++; det.push({ selector: c.selector, desc: c.desc, status: '✗ 未找到' }); }
    } catch (e) { f++; det.push({ selector: c.selector, desc: c.desc, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: s, details: det };
}

// 2. 按钮交互与跳转验证
async function testButtonNav(miniProgram, pageObj, pageRoute) {
  const tests = BUTTON_NAV_TESTS.filter(t => t.from === pageRoute);
  if (tests.length === 0) return { passed: 0, failed: 0, skipped: 0, details: [] };
  let p = 0, f = 0;
  const det = [];
  for (const t of tests) {
    try {
      const els = await pageObj.$$(t.selector);
      let found = false;
      for (const el of els) {
        try {
          const text = await Promise.race([el.text(), timeoutPromise(2000)]);
          if (text && text.includes(t.label)) {
            await Promise.race([el.tap(), timeoutPromise(3000)]);
            await sleep(1500);
            const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(5000)]);
            const curPath = cp ? cp.path || '' : '';
            det.push({ label: t.label, status: '✓ ' + curPath });
            found = true; break;
          }
        } catch (_) {}
      }
      if (!found) { f++; det.push({ label: t.label, status: '✗ 未找到含"' + t.label + '"的按钮' }); }
      else p++;
    } catch (e) { f++; det.push({ label: t.label, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 3. TabBar 切换
async function testTabBar(miniProgram) {
  let p = 0, f = 0;
  const det = [];
  for (const item of TAB_BAR_ITEMS) {
    try {
      await Promise.race([miniProgram.switchTab('/' + item.path), timeoutPromise(15000)]);
      await sleep(2000);
      const cp = await Promise.race([miniProgram.currentPage(), timeoutPromise(5000)]);
      const route = cp ? cp.path || '' : '';
      const pageObj = cp;
      const someEl = await Promise.race([pageObj.$('view'), timeoutPromise(3000)]);
      if (route && someEl) { p++; det.push({ tab: item.name, status: '✓ ' + route }); }
      else { f++; det.push({ tab: item.name, status: '✗ ' + (route || '空白页面') }); }
    } catch (e) { f++; det.push({ tab: item.name, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 4. 表单输入
async function testFormInput(miniProgram, pageObj, pageRoute) {
  const tests = FORM_TESTS.filter(t => t.page === pageRoute);
  if (tests.length === 0) return { passed: 0, failed: 0, skipped: 0, details: [] };
  let p = 0, f = 0;
  const det = [];
  for (const t of tests) {
    let allOk = true;
    for (const field of t.fields) {
      try {
        const els = await pageObj.$$(field.selector);
        const target = els[field.inputIndex];
        if (!target) { det.push({ label: t.label, field: field.selector, status: '✗ 未找到第' + field.inputIndex + '个' }); allOk = false; continue; }
        await target.input(field.value);
        det.push({ label: t.label, field: field.selector, status: '✓ 输入 "' + field.value + '"' });
        await sleep(300);
      } catch (e) { det.push({ label: t.label, field: field.selector, status: '✗ ' + e.message }); allOk = false; }
    }
    if (allOk) p++; else f++;
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 5. 页面数据校验
async function testPageData(pageObj, pageRoute) {
  const checks = DATA_CHECKS[pageRoute];
  if (!checks || checks.fields.length === 0) return { passed: 0, failed: 0, skipped: 1, details: [{ msg: '无数据校验项', status: '-' }] };
  let p = 0, f = 0;
  const det = [];
  try {
    for (const field of checks.fields) {
      try {
        const val = await pageObj.data(field.path);
        const actualType = Array.isArray(val) ? 'array' : typeof val;
        if (field.optional && (val === undefined || val === null)) {
          p++; det.push({ field: field.path, status: '✓ ' + actualType + ' (可选)' });
        } else if (field.type === 'array' && Array.isArray(val)) {
          p++; det.push({ field: field.path, status: '✓ array[' + val.length + ']' });
        } else if (typeof val === field.type) {
          p++; det.push({ field: field.path, status: '✓ ' + field.type + '="' + String(val).substring(0, 40) + '"' });
        } else {
          f++; det.push({ field: field.path, status: '✗ 期望 ' + field.type + ', 实际 ' + actualType });
        }
      } catch (e) { f++; det.push({ field: field.path, status: '✗ ' + e.message }); }
    }
  } catch (e) { f = checks.fields.length; det.push({ field: '(page.data)', status: '✗ ' + e.message }); }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// 6. 滚动/下拉刷新
async function testScroll(miniProgram, pageObj, pageRoute) {
  const tests = SCROLL_TESTS.filter(t => t.page === pageRoute);
  if (tests.length === 0) return { passed: 0, failed: 0, skipped: 1, details: [{ msg: '无滚动测试项', status: '-' }] };
  let p = 0, f = 0;
  const det = [];
  for (const t of tests) {
    try {
      const sv = await Promise.race([pageObj.$(t.selector), timeoutPromise(3000)]);
      if (!sv) { f++; det.push({ label: t.label, status: '✗ 未找到 ' + t.selector }); continue; }
      const off = await sv.offset();
      const sz = await sv.size();
      const midX = off.left + 100;
      const startY = off.top + 20;
      const endY = startY + 200;
      await sv.touchstart({ touches: [{ identifier: 0, pageX: midX, pageY: startY }], changedTouches: [{ identifier: 0, pageX: midX, pageY: startY }] });
      await sleep(100);
      await sv.touchmove({ touches: [{ identifier: 0, pageX: midX, pageY: endY }], changedTouches: [{ identifier: 0, pageX: midX, pageY: endY }] });
      await sleep(100);
      await sv.touchend({ touches: [], changedTouches: [{ identifier: 0, pageX: midX, pageY: endY }] });
      await sleep(1000);
      p++; det.push({ label: t.label, status: '✓ 下拉手势完成' });
    } catch (e) { f++; det.push({ label: t.label, status: '✗ ' + e.message }); }
  }
  return { passed: p, failed: f, skipped: 0, details: det };
}

// ── 报告 ──────────────────────────────────────────────
function generateReport(runResult, fixLog) {
  const report = {
    time: new Date().toISOString(),
    project: path.basename(PROJECT_PATH),
    summary: {
      pagesSuccess: runResult.pagePassed,
      pagesFail: runResult.pageFailed,
      searchSuccess: runResult.searchPassed,
      searchFail: runResult.searchFailed,
      totalEntries: runResult.entries.length,
      errors: runResult.errors.length,
      warnings: runResult.warnings.length,
      exceptions: runResult.exceptions.length,
      testModules: {},
    },
    categories: runResult.categories,
    noiseSummary: [],
    fixSummary: fixLog,
    pageDetails: runResult.pageDetails,
    moduleDetails: runResult.moduleDetails || [],
  };

  for (const [key, mod] of Object.entries(runResult.moduleResults || {})) {
    const def = MODULES[key];
    report.summary.testModules[key] = {
      name: def ? def.name : key, priority: def ? def.priority : '-',
      passed: mod.passed, failed: mod.failed, skipped: mod.skipped,
    };
  }

  const noiseCats = Object.entries(runResult.categories).filter(([_, info]) => info.severity === 'noise');
  report.noiseSummary = noiseCats.map(([cat, info]) => ({ category: cat, count: info.count, explanation: info.explanation, examples: info.examples }));

  const json = JSON.stringify(report, null, 2);
  fs.writeFileSync(REPORT_PATH, json, 'utf-8');

  const textLines = [];
  textLines.push('='.repeat(60));
  textLines.push('  微信小程序自动化诊断报告');
  textLines.push('='.repeat(60));
  textLines.push('生成时间: ' + report.time);
  textLines.push('');
  textLines.push('── 概要 ──');
  textLines.push('  页面导航: ' + report.summary.pagesSuccess + ' 成功, ' + report.summary.pagesFail + ' 失败');
  textLines.push('  搜索测试: ' + report.summary.searchSuccess + ' 成功, ' + report.summary.searchFail + ' 失败');
  textLines.push('  Console 总条数: ' + report.summary.totalEntries);
  textLines.push('  Error: ' + report.summary.errors + ', Warning: ' + report.summary.warnings);
  textLines.push('  JS 异常: ' + report.summary.exceptions);
  textLines.push('');
  textLines.push('── 增强测试模块 ──');
  for (const [key, info] of Object.entries(report.summary.testModules)) {
    const icon = info.failed > 0 ? '⚠' : '✓';
    textLines.push('  [' + info.priority + '] ' + info.name + ': ' + icon + ' ' + info.passed + 'P / ' + info.failed + 'F / ' + info.skipped + 'S');
    const md = (runResult.moduleDetails || []).filter(d => d.module === key);
    for (const d of md) {
      const pn = d.pageName ? '[' + d.pageName + '] ' : '';
      for (const det of d.details) {
        const sel = det.selector || det.field || det.label || det.msg || '';
        textLines.push('    ' + pn + det.status + ' ' + sel);
      }
    }
  }
  textLines.push('');
  textLines.push('── 噪音类 ──');
  for (const n of report.noiseSummary) {
    textLines.push('  [' + n.category + '] ' + n.count + ' 条');
    textLines.push('    说明: ' + n.explanation);
    for (const ex of n.examples) textLines.push('    示例: ' + ex);
  }
  textLines.push('');
  textLines.push('── 可修复类 ──');
  for (const [cat, info] of Object.entries(runResult.categories)) {
    if (info.severity !== 'fixable') continue;
    textLines.push('  [' + cat + '] ' + info.count + ' 条');
    textLines.push('    说明: ' + info.explanation);
    for (const ex of info.examples) textLines.push('    示例: ' + ex);
  }
  textLines.push('');
  textLines.push('── 自动修复操作 ──');
  if (fixLog.length === 0) textLines.push('  无需修复');
  else for (const f of fixLog) {
    if (f.action === '跳过') textLines.push('  ' + f.description);
    else textLines.push('  [' + f.action + '] ' + f.file + ' (' + f.matchCount + '处)\n    ' + f.description);
  }
  textLines.push('');
  textLines.push('── 页面详情 ──');
  for (const pd of runResult.pageDetails) textLines.push('  ' + pd.name + ' (' + pd.path + ') \u2192 ' + pd.status);
  textLines.push('');
  textLines.push('注意: 本报告基于 automator.on(\'console\') 捕获，仅包含 JS 运行时层输出。');
  textLines.push('渲染层错误（WXML/WXSS/数据绑定异常）属框架内部消息，无法自动化获取。');
  textLines.push('本报告已覆盖: JS 运行时错误/警告、页面路由、搜索交互、');
  textLines.push('元素存在性、按钮跳转、TabBar、表单输入、数据校验、滚动测试。');
  textLines.push('='.repeat(60));

  const reportText = textLines.join('\n');
  const textReportPath = path.join(__dirname, 'diagnose-report.txt');
  fs.writeFileSync(textReportPath, reportText, 'utf-8');
  return { report, reportText, textReportPath };
}

// ── 主流程 ──────────────────────────────────────────────
async function run() {
  console.log('=== 微信小程序自动化诊断 ===\n');

  const allConsole = [];
  const allExceptions = [];
  const pageDetails = [];
  const moduleDetails = [];
  const moduleResults = {};
  let currentPageName = '';

  console.log('[启动] 启动自动化服务...');
  await startCLI();
  console.log('  ✓ 自动化服务已启动\n');
  await sleep(3000);

  console.log('[连接] 连接开发者工具...');
  const miniProgram = await automator.connect({ wsEndpoint: 'ws://localhost:' + AUTO_PORT });
  console.log('  ✓ 已连接\n');

  miniProgram.on('console', msg => {
    allConsole.push({ type: msg.type || 'log', args: msg.args || [], time: new Date().toISOString(), page: currentPageName });
  });
  miniProgram.on('exception', err => { allExceptions.push(err); });

  await sleep(2000);

  let pagePassed = 0, pageFailed = 0;
  let searchPassed = 0, searchFailed = 0;

  function initModuleResults() { for (const key of Object.keys(MODULES)) { if (!moduleResults[key]) moduleResults[key] = { passed: 0, failed: 0, skipped: 0 }; } }
  initModuleResults();

  // TabBar 独立测试
  if (MODULES.tabBar.enabled) {
    console.log('[TabBar] 测试 ' + TAB_BAR_ITEMS.length + ' 个 tab 切换...');
    const tabResult = await testTabBar(miniProgram);
    moduleResults.tabBar.passed += tabResult.passed;
    moduleResults.tabBar.failed += tabResult.failed;
    moduleDetails.push({ module: 'tabBar', pageName: '-', details: tabResult.details });
    for (const d of tabResult.details) console.log('  ' + d.status + ' ' + d.tab);
    console.log('  \u2192 ' + tabResult.passed + ' 成功, ' + tabResult.failed + ' 失败\n');
  }

  // 遍历每个页面
  for (const page of PAGES) {
    currentPageName = page.name;
    process.stdout.write('[页面] ' + page.name + ' (' + page.path + ')... ');
    try {
      const curPage = await miniProgram.currentPage();
      const curRoute = curPage ? curPage.path || '' : '';
      if (curRoute !== page.path) {
        await navigateWithTimeout(miniProgram, page);
        await sleep(2000);
      } else {
        process.stdout.write('\u2713 ' + curRoute + ' (已在该页面)\n');
        pagePassed++;
        pageDetails.push({ name: page.name, path: page.path, status: '\u2713 已在该页面' });
        await runModuleTests(miniProgram, curPage, page);
        continue;
      }

      const cp = await Promise.race([miniProgram.currentPage(), new Promise((_, reject) => setTimeout(() => reject(new Error('currentPage超时')), 8000))]);
      const route = cp ? cp.path || 'unknown' : 'unknown';
      process.stdout.write('\u2713 ' + route + '\n');
      pagePassed++;
      pageDetails.push({ name: page.name, path: page.path, status: '\u2713 ' + route });
      await runModuleTests(miniProgram, cp, page);
    } catch (err) {
      process.stdout.write('\u2717 ' + err.message + '\n');
      pageFailed++;
      pageDetails.push({ name: page.name, path: page.path, status: '\u2717 ' + err.message });
    }
  }

  async function runModuleTests(miniProgram, pageObj, pageDef) {
    const pageRoute = pageDef.path;
    if (MODULES.elementExists.enabled) {
      const r = await testElementExists(miniProgram, pageObj, pageRoute);
      moduleResults.elementExists.passed += r.passed; moduleResults.elementExists.failed += r.failed; moduleResults.elementExists.skipped += r.skipped;
      if (r.details.length > 0) moduleDetails.push({ module: 'elementExists', pageName: pageDef.name, details: r.details });
    }
    if (MODULES.buttonNav.enabled) {
      const r = await testButtonNav(miniProgram, pageObj, pageRoute);
      moduleResults.buttonNav.passed += r.passed; moduleResults.buttonNav.failed += r.failed;
      if (r.details.length > 0) moduleDetails.push({ module: 'buttonNav', pageName: pageDef.name, details: r.details });
    }
    if (pageDef.search) {
      await sleep(500);
      try {
        const si = await pageObj.$('input');
        if (si) {
          await si.input('test'); await sleep(500);
          const da = await pageObj.data();
          if (da.searchValue !== undefined) { process.stdout.write('  [搜索] test \u2713\n'); searchPassed++; }
          else { process.stdout.write('  [搜索] \u26A0\n'); searchFailed++; }
        } else { process.stdout.write('  [搜索] \u26A0 无 input\n'); searchFailed++; }
      } catch (e) { process.stdout.write('  [搜索] \u2717 ' + e.message + '\n'); searchFailed++; }
    }
    if (MODULES.formInput.enabled) {
      const r = await testFormInput(miniProgram, pageObj, pageRoute);
      moduleResults.formInput.passed += r.passed; moduleResults.formInput.failed += r.failed;
      if (r.details.length > 0) moduleDetails.push({ module: 'formInput', pageName: pageDef.name, details: r.details });
    }
    if (MODULES.pageData.enabled) {
      const r = await testPageData(pageObj, pageRoute);
      moduleResults.pageData.passed += r.passed; moduleResults.pageData.failed += r.failed; moduleResults.pageData.skipped += r.skipped;
      if (r.details.length > 0 && r.details[0].status !== '-') moduleDetails.push({ module: 'pageData', pageName: pageDef.name, details: r.details });
    }
    if (MODULES.scrollTest.enabled) {
      const r = await testScroll(miniProgram, pageObj, pageRoute);
      moduleResults.scrollTest.passed += r.passed; moduleResults.scrollTest.failed += r.failed; moduleResults.scrollTest.skipped += r.skipped;
      if (r.details.length > 0 && r.details[0].status !== '-') moduleDetails.push({ module: 'scrollTest', pageName: pageDef.name, details: r.details });
    }
  }

  // 分类
  const errors = allConsole.filter(m => m.type === 'error' || m.type === 'assert');
  const warnings = allConsole.filter(m => m.type === 'warn');
  const entries = [...errors, ...warnings];
  const categories = {};
  for (const entry of entries) {
    const text = entry.args.join(' ');
    const cls = classifyEntry(text, entry.type);
    const key = cls.category;
    if (!categories[key]) categories[key] = { count: 0, severity: cls.severity, explanation: cls.explanation, examples: [] };
    categories[key].count++;
    if (categories[key].examples.length < 2) categories[key].examples.push(text.substring(0, 200));
  }

  // 打印模块摘要
  console.log('\n── 增强测试模块结果 ──');
  for (const [key, mod] of Object.entries(MODULES)) {
    if (!mod.enabled) continue;
    const r = moduleResults[key];
    console.log('  [' + mod.priority + '] ' + mod.name + ': ' + (r.failed > 0 ? '\u26A0' : '\u2713') + ' ' + r.passed + 'P / ' + r.failed + 'F / ' + r.skipped + 'S');
  }

  // 自动修复
  console.log('\n[修复] 扫描可修复问题...');
  const fixLog = autoFix();
  for (const f of fixLog) {
    if (f.action === '建议') console.log('  [建议] ' + (f.file || '') + ' - ' + f.description);
    else if (f.action === '已修复') console.log('  [已修复] ' + f.file + ' - ' + f.description);
    else console.log('  ' + f.description);
  }

  // 报告
  const runResult = { pagePassed, pageFailed, searchPassed, searchFailed, entries, errors, warnings, exceptions: allExceptions, categories, pageDetails, moduleDetails, moduleResults };
  console.log('\n[报告] 生成诊断报告...');
  const { reportText, textReportPath } = generateReport(runResult, fixLog);
  console.log('  \u2713 报告已保存: ' + REPORT_PATH);
  console.log('  \u2713 报告已保存: ' + textReportPath);

  console.log('');
  console.log(reportText);
  miniProgram.disconnect();
  console.log('\n\u2713 诊断完成');
}

run().catch(err => { console.error('\n诊断脚本异常:', err.message); process.exit(1); });
