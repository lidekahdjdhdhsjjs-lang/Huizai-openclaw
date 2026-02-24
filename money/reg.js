#!/usr/bin/env node

/**
 * 中国平台注册系统
 * 手机号: 18123737466
 */

const PLATFORMS = {
  // 有收入潜力的平台
  'zhihu': {
    name: '知乎',
    url: 'https://www.zhihu.com/signup',
    verify: 'sms',
    income: '高',
    priority: 1
  },
  'xiaohongshu': {
    name: '小红书',
    url: 'https://www.xiaohongshu.com/register',
    verify: 'sms',
    income: '高',
    priority: 1
  },
  'douyin': {
    name: '抖音',
    url: 'https://www.douyin.com/register',
    verify: 'sms',
    income: '高',
    priority: 1
  },
  'wechat_mp': {
    name: '微信公众号',
    url: 'https://mp.weixin.qq.com/',
    verify: 'sms',
    income: '高',
    priority: 1
  },
  'bilibili': {
    name: 'B站',
    url: 'https://passport.bilibili.com/register',
    verify: 'sms',
    income: '中',
    priority: 2
  },
  'taobao': {
    name: '淘宝',
    url: 'https://reg.taobao.com/member/reg/fill.htm',
    verify: 'sms',
    income: '中',
    priority: 2
  },
  'alipay': {
    name: '支付宝',
    url: 'https://memberprod.alipay.com/member/register/index.htm',
    verify: 'sms+face',
    income: '高',
    priority: 1
  },
  'weibo': {
    name: '微博',
    url: 'https://login.sina.com.cn/signup/signup.php',
    verify: 'sms',
    income: '中',
    priority: 2
  }
};

// 账号记录
const ACCOUNTS_FILE = '/tmp/platform-accounts.json';

let accounts = {};

function loadAccounts() {
  try {
    accounts = JSON.parse(require('fs').readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {}
}

function saveAccounts() {
  require('fs').writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

function register(platform) {
  const p = PLATFORMS[platform];
  if (!p) return { error: '平台不存在' };
  
  console.log(`\n📱 注册 ${p.name}...`);
  console.log(`   手机: 18123737466`);
  console.log(`   网址: ${p.url}`);
  console.log(`   验证: ${p.verify}`);
  console.log(`   收入: ${p.income}`);
  
  // 记录
  accounts[platform] = {
    phone: '18123737466',
    registered: false,
    verified: false,
    url: p.url,
    time: Date.now()
  };
  saveAccounts();
  
  return { status: 'ready', platform: p.name };
}

function listPlatforms() {
  console.log('\n=== 可注册平台 ===\n');
  
  const sorted = Object.entries(PLATFORMS)
    .sort((a, b) => a[1].priority - b[1].priority);
  
  for (const [key, p] of sorted) {
    const status = accounts[key]?.registered ? '✅' : '⏳';
    console.log(`${status} [P${p.priority}] ${p.name} - ${p.income}收入`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  console.log('=== 中国平台注册系统 ===');
  console.log('手机号: 18123737466\n');
  
  if (cmd === 'list') {
    listPlatforms();
  } else if (cmd === 'register' && args[1]) {
    console.log(register(args[1]));
  } else if (cmd === 'status') {
    loadAccounts();
    console.log('\n=== 账号状态 ===\n');
    console.log(JSON.stringify(accounts, null, 2));
  } else {
    console.log('用法:');
    console.log('  node reg.js list        - 列出平台');
    console.log('  node reg.js register <平台> - 注册');
    console.log('  node reg.js status      - 查看状态');
    console.log('\n平台: zhihu, xiaohongshu, douyin, wechat_mp, bilibili, taobao, alipay, weibo');
  }
}

main();
