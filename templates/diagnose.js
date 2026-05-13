const automator = require('miniprogram-automator');
const { spawn } = require('child_process');

const CLI_PATH = 'E:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat';
const PROJECT_PATH = 'E:\\AI\\wechatbot';
const AUTO_PORT = 9420;

function classifyEntry(text, type) {
  const rules = [
    { pattern: /received type.uncompatible|type.uncompatible/, category: '组件属性类型不匹配', severity: 'noise', explanation: '传入属性类型与组件声明不一致，框架自动类型转换' },
    { pattern: /deprecated|弃用|removed/i, category: '已废弃 API', severity: 'fixable', explanation: '使用了已废弃的 API，建议迁移到新版' },
    { pattern: /Can't find variable|is not defined/i, category: '引用错误', severity: 'fixable', explanation: '引用了未定义的变量，会导致 JS 执行中断' },
    { pattern: /Failed to load|failed to load|网络层错误|渲染层/i, category: '资源加载失败', severity: 'fixable', explanation: '静态资源（字体/图片/文件）加载失败' },
    { pattern: /script error|ScriptError|thirdScriptError/i, category: '脚本异常', severity: 'fixable', explanation: '框架捕获的未处理 JS 异常' },
    { pattern: /\[Component\]/, category: '组件内部警告', severity: 'noise', explanation: '自定义组件的非关键警告，不影响功能' },
    { pattern: /\[system\]|\[Perf\]|\[WXML\]/, category: '框架日志', severity: 'noise', explanation: '小程序框架内部日志，与业务代码无关' },
  ];
  for (const r of rules) {
    if (r.pattern.test(text)) return r;
  }
  return { category: type === 'error' ? '其他错误' : '其他警告', severity: 'unknown', explanation: '' };
}

const PAGES = [
  { path: 'pages/index/index', name: '首页', tab: true },
  { path: 'pages/user/user', name: '个人中心', tab: true },
  { path: 'german/pages/learn/learn', name: '德语-闯关路径' },
  { path: 'german/pages/course/course', name: '德语-课程中心' },
  { path: 'german/pages/lesson/lesson', name: '德语-课程详情' },
  { path: 'german/pages/learn/challenge?level=a1&index=1', name: '德语-挑战' },
  { path: 'german/pages/learn/review', name: '德语-复习' },
  { path: 'german/pages/learn/result?score=5&total=8&passed=true&wrong=[]', name: '德语-结果' },
  { path: 'german/pages/wordbook/wordbook', name: '德语-生词本' },
  { path: 'german/pages/grammar/grammar', name: '德语-语法' },
  { path: 'german/pages/textbook/textbook', name: '德语-课本' },
  { path: 'german/pages/leaderboard/leaderboard', name: '德语-排行榜' },
  { path: 'german/pages/aichat/aichat', name: '德语-AI聊天' },
  { path: 'japanese/pages/learn/learn', name: '日语-闯关路径' },
  { path: 'japanese/pages/course/course', name: '日语-课程中心' },
  { path: 'japanese/pages/lesson/lesson', name: '日语-课程详情' },
  { path: 'japanese/pages/wordbook/wordbook', name: '日语-生词本', search: true },
  { path: 'japanese/pages/grammar/grammar', name: '日语-语法' },
  { path: 'japanese/pages/textbook/textbook', name: '日语-课本' },
  { path: 'japanese/pages/leaderboard/leaderboard', name: '日语-排行榜' },
  { path: 'word/pages/index/index', name: '作文本', search: true },
  { path: 'pdf/pages/index/index', name: 'PDF工具' },
  { path: 'pdf/pages/convert/convert', name: 'PDF转换' },
  { path: 'pdf/pages/edit/edit', name: 'PDF编辑' },
  { path: 'smart-teacher/pages/chat/chat', name: 'AI老师' },
  { path: 'word/pages/editor/editor', name: '作文编辑器' },
];

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
    }, 40000);
    proc.on('exit', code => {
      clearTimeout(timer);
      if (out.includes('√ auto')) resolve(proc);
      else reject(new Error(`CLI exited ${code}:\n${out}`));
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('=== 微信小程序自动化诊断 (含搜索测试) ===\n');

  const allConsole = [];
  const allExceptions = [];

  console.log('[启动] 启动自动化服务...');
  await startCLI();
  console.log('  ✓ 自动化服务已启动\n');
  await sleep(3000);

  console.log('[连接] 连接开发者工具...');
  const miniProgram = await automator.connect({ wsEndpoint: `ws://localhost:${AUTO_PORT}` });
  console.log('  ✓ 已连接\n');

  miniProgram.on('console', msg => {
    allConsole.push({ type: msg.type || 'log', args: msg.args || [], time: new Date().toISOString() });
  });
  miniProgram.on('exception', err => { allExceptions.push(err); });

  await sleep(2000);

  let pagePassed = 0, pageFailed = 0;
  let searchPassed = 0, searchFailed = 0;

  // Navigate all pages + search test
  for (const page of PAGES) {
    const label = `[页面] ${page.name} (${page.path})`;
    process.stdout.write(`${label}... `);
    try {
      if (page.tab) await miniProgram.switchTab('/' + page.path);
      else await miniProgram.redirectTo('/' + page.path);
      await sleep(2000);

      const cp = await miniProgram.currentPage();
      const route = cp ? cp.path || 'unknown' : 'unknown';
      process.stdout.write(`✓ ${route}\n`);
      pagePassed++;

      // --- Search interaction tests ---
      if (page.search) {
        await sleep(500);

        // Search test 1: type into search input
        try {
          const searchInput = await cp.$('input');
          if (searchInput) {
            const tag = await searchInput.tagName;
            process.stdout.write(`  [搜索] 找到 <${tag}> 输入框`);

            // Type a search term using InputElement.input
            await searchInput.input('test');
            await sleep(500);

            // Check if searchKey was updated
            const dataAfter = await cp.data();
            const hasSearchKey = dataAfter.searchKey !== undefined;
            const keyVal = dataAfter.searchKey;
            process.stdout.write(`, searchKey="${keyVal}"`);
            if (hasSearchKey) {
              process.stdout.write(` ✓\n`);
              searchPassed++;
            } else {
              process.stdout.write(` ⚠ 未更新 searchKey\n`);
              searchFailed++;
            }

            // Search test 2: clear the search
            const clearBtn = await cp.$('.clear-btn, .search-clear');
            if (clearBtn) {
              await clearBtn.tap();
              await sleep(300);
              const dataCleared = await cp.data();
              process.stdout.write(`  [搜索] 清除后 searchKey="${dataCleared.searchKey}"`);
              if (!dataCleared.searchKey || dataCleared.searchKey === '') {
                process.stdout.write(` ✓\n`);
                searchPassed++;
              } else {
                process.stdout.write(` ⚠ 清除失败\n`);
                searchFailed++;
              }
            } else {
              process.stdout.write(`  [搜索] 清除按钮未找到\n`);
            }
          } else {
            process.stdout.write(`  [搜索] ⚠ 未找到 input 元素\n`);
          }
        } catch (e) {
          process.stdout.write(`  [搜索] ✗ ${e.message}\n`);
          searchFailed++;
        }
      }
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
      pageFailed++;
    }
  }

  // Summary
  console.log('\n=== 页面路由结果 ===');
  console.log(`${pagePassed} 成功, ${pageFailed} 失败`);

  console.log('\n=== 搜索测试结果 ===');
  console.log(`${searchPassed} 成功, ${searchFailed} 失败`);

  const errors = allConsole.filter(m => m.type === 'error' || m.type === 'assert');
  const warnings = allConsole.filter(m => m.type === 'warn');
  console.log(`\n=== Console ===`);
  console.log(`errors: ${errors.length}, warnings: ${warnings.length}`);
  for (const e of errors) console.log(`  [${e.time}] ${e.args.join(' | ')}`);
  for (const w of warnings) console.log(`  ${w.args.join(' | ')}`);

  console.log(`\n=== JS异常 ===`);
  console.log(`${allExceptions.length} 条`);
  for (const ex of allExceptions) {
    console.log(`  ${ex.message}`);
    if (ex.stack) console.log(`  Stack: ${ex.stack.substring(0, 200)}`);
  }

  console.log('\n✓ 诊断完成');
  miniProgram.disconnect();
}

run().catch(err => {
  console.error('\n诊断脚本异常:', err.message);
  process.exit(1);
});
