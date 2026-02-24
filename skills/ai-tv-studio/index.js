#!/usr/bin/env node

/**
 * AI电视剧全自动生产系统 - 主入口
 * 
 * 功能:
 * - init: 初始化新剧
 * - produce: 生成剧集
 * - publish: 发布视频
 * - status: 查看状态
 * - test: 测试视频生成
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const SKILL_DIR = __dirname;
const DATA_DIR = path.join(SKILL_DIR, 'data');
const UNIVERS_DIR = path.join(DATA_DIR, 'universes');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');
const TEMPLATES_DIR = path.join(SKILL_DIR, 'templates');

// 确保目录存在
function ensureDirs() {
  [DATA_DIR, UNIVERS_DIR, OUTPUT_DIR, TEMPLATES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 主命令处理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  ensureDirs();

  switch (command) {
    case 'test':
      await runTest();
      break;
    case 'init':
      await initSeries(args);
      break;
    case 'produce':
      await produceEpisode(args);
      break;
    case 'publish':
      await publishEpisode(args);
      break;
    case 'status':
      showStatus();
      break;
    case 'help':
    default:
      showHelp();
  }
}

// 显示帮助
function showHelp() {
  console.log(`
AI电视剧全自动生产系统 v1.0.0

用法:
  node index.js <command> [options]

命令:
  test                    生成测试视频
  init                    初始化新剧
    --name <name>         剧集名称
    --genre <type>        类型: 玄幻/悬疑/甜宠/搞笑
    --seasons <n>         季数 (默认: 3)
    --episodes <n>        每季集数 (默认: 500)
  
  produce                 生成剧集
    --episode <n>         指定集数
    --batch <n>           批量生成
    --next                生成下一集
  
  publish                 发布视频
    --platform <name>     平台: bilibili/douyin/all
    --episode <n>         指定集数
    --pending             发布所有待发布
  
  status                  查看生产状态

示例:
  node index.js test
  node index.js init --name "九天神途" --genre 玄幻 --seasons 3
  node index.js produce --episode 1
  node index.js produce --batch 10
  node index.js publish --platform bilibili --episode 1
  node index.js status
`);
}

// 运行测试
async function runTest() {
  console.log('🎬 运行测试视频生成...\n');
  
  const testScript = path.join(SKILL_DIR, 'scripts', 'test-episode.sh');
  
  if (!fs.existsSync(testScript)) {
    console.error('❌ 测试脚本不存在');
    process.exit(1);
  }

  try {
    execSync(`bash "${testScript}"`, { stdio: 'inherit' });
    console.log('\n✅ 测试完成！查看桌面上的 test-ai-tv.mp4');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 初始化新剧
async function initSeries(args) {
  const options = parseArgs(args);
  
  const name = options.name || '未命名剧集';
  const genre = options.genre || '玄幻';
  const seasons = parseInt(options.seasons) || 3;
  const episodesPerSeason = parseInt(options.episodes) || 500;

  console.log(`\n📚 初始化新剧: ${name}`);
  console.log(`   类型: ${genre}`);
  console.log(`   季数: ${seasons}`);
  console.log(`   每季集数: ${episodesPerSeason}`);
  console.log(`   总集数: ${seasons * episodesPerSeason}\n`);

  const seriesDir = path.join(UNIVERS_DIR, sanitizeName(name));
  
  if (fs.existsSync(seriesDir)) {
    console.error(`❌ 剧集 "${name}" 已存在`);
    process.exit(1);
  }

  fs.mkdirSync(seriesDir, { recursive: true });

  // 创建世界观
  const world = {
    universe_id: generateId(),
    universe_name: name,
    genre: genre,
    era: genre === '玄幻' ? '架空古代' : '现代',
    core_conflict: '',
    magic_system: genre === '玄幻' ? '修仙体系' : null,
    visual_style: getVisualStyle(genre),
    created_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(seriesDir, 'world.json'), JSON.stringify(world, null, 2));

  // 创建角色模板
  const characters = {
    characters: getDefaultCharacters(genre)
  };
  fs.writeFileSync(path.join(seriesDir, 'characters.json'), JSON.stringify(characters, null, 2));

  // 创建场景道具库
  const assets = {
    scenes: getDefaultScenes(genre),
    props: getDefaultProps(genre)
  };
  fs.writeFileSync(path.join(seriesDir, 'assets.json'), JSON.stringify(assets, null, 2));

  // 创建分集大纲 (占位)
  const episodes = {
    total: seasons * episodesPerSeason,
    seasons: seasons,
    episodes_per_season: episodesPerSeason,
    outline: [],
    created_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(seriesDir, 'episodes.json'), JSON.stringify(episodes, null, 2));

  // 创建进度追踪
  const progress = {
    current_episode: 0,
    completed_episodes: [],
    pending_episodes: [],
    failed_episodes: [],
    last_updated: new Date().toISOString()
  };
  fs.writeFileSync(path.join(seriesDir, 'progress.json'), JSON.stringify(progress, null, 2));

  console.log(`✅ 剧集初始化完成！`);
  console.log(`📁 目录: ${seriesDir}\n`);
  console.log(`下一步:`);
  console.log(`  1. 编辑 ${seriesDir}/characters.json 定义角色`);
  console.log(`  2. 编辑 ${seriesDir}/episodes.json 生成分集大纲`);
  console.log(`  3. 运行 node index.js produce --episode 1\n`);
}

// 生成剧集
async function produceEpisode(args) {
  const options = parseArgs(args);
  
  // 查找已初始化的剧集
  const series = findActiveSeries();
  if (!series) {
    console.error('❌ 没有找到已初始化的剧集，请先运行 init');
    process.exit(1);
  }

  console.log(`\n🎬 生产剧集: ${series.name}\n`);

  const episodeNum = parseInt(options.episode) || getNextEpisode(series);
  const batch = parseInt(options.batch) || 1;

  if (options.next || !options.episode) {
    console.log(`   下一集: 第${episodeNum}集`);
  }

  for (let i = 0; i < batch; i++) {
    const ep = episodeNum + i;
    console.log(`\n📹 生成第 ${ep} 集...`);
    
    try {
      await produceSingleEpisode(series, ep);
      console.log(`   ✅ 第 ${ep} 集生成完成`);
    } catch (error) {
      console.error(`   ❌ 第 ${ep} 集生成失败:`, error.message);
    }
  }

  console.log('\n✅ 生产完成！\n');
}

// 生成单集
async function produceSingleEpisode(series, episodeNum) {
  const outputDir = path.join(OUTPUT_DIR, series.name, 'S01', `EP${String(episodeNum).padStart(3, '0')}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // 步骤1: 生成剧本
  console.log('   📝 生成剧本...');
  const script = await generateScript(series, episodeNum);
  fs.writeFileSync(path.join(outputDir, 'script.md'), script);

  // 步骤2: 生成分镜
  console.log('   🎬 生成分镜...');
  const storyboard = await generateStoryboard(series, script, episodeNum);
  fs.writeFileSync(path.join(outputDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2));

  // 步骤3: 生成配音
  console.log('   🎙️ 生成配音...');
  await generateVoice(script, path.join(outputDir, 'audio'));

  // 步骤4: 生成画面 (简化版使用文字)
  console.log('   🖼️ 准备画面...');
  await generateImages(storyboard, path.join(outputDir, 'images'));

  // 步骤5: 合成视频
  console.log('   🎞️ 合成视频...');
  await composeVideo(outputDir);

  // 更新进度
  updateProgress(series.path, episodeNum, 'completed');

  return outputDir;
}

// 生成剧本 (简化版)
async function generateScript(series, episodeNum) {
  const world = JSON.parse(fs.readFileSync(path.join(series.path, 'world.json')));
  const characters = JSON.parse(fs.readFileSync(path.join(series.path, 'characters.json')));

  // 简化的剧本生成
  const script = `# ${world.universe_name} 第${episodeNum}集

## 场景1

[旁白]
第${episodeNum}集，故事继续...

${characters.characters[0] ? `[${characters.characters[0].name}]\n今日便是修炼之时。` : ''}

## 场景2

[旁白]
命运的齿轮，继续转动...

---

生成时间: ${new Date().toISOString()}
`;

  return script;
}

// 生成分镜 (简化版)
async function generateStoryboard(series, script, episodeNum) {
  return {
    episode: episodeNum,
    shots: [
      { shot_id: `${episodeNum}_001`, duration: 3, description: '开场' },
      { shot_id: `${episodeNum}_002`, duration: 5, description: '主要对话' },
      { shot_id: `${episodeNum}_003`, duration: 3, description: '结尾' }
    ]
  };
}

// 生成配音
async function generateVoice(script, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  
  const edgeTts = path.join(process.env.HOME, '.local', 'bin', 'edge-tts');
  
  if (!fs.existsSync(edgeTts)) {
    console.log('   ⚠️ edge-tts 未安装，跳过配音');
    return;
  }

  // 简化：生成一段测试配音
  const textFile = path.join(outputDir, 'text.txt');
  fs.writeFileSync(textFile, '这是测试配音');
  
  try {
    execSync(`${edgeTts} -f "${textFile}" -v zh-CN-YunxiNeural --write-media "${path.join(outputDir, 'voice.mp3')}"`, 
      { stdio: 'pipe' });
  } catch (e) {
    // 忽略错误
  }
}

// 生成画面 (简化版)
async function generateImages(storyboard, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  
  // 使用 ffmpeg 生成简单背景图
  for (let i = 0; i < 3; i++) {
    const bgColors = ['0x1a1a2e', '0x16213e', '0x0f3460'];
    try {
      execSync(`ffmpeg -y -f lavfi -i "color=c=${bgColors[i]}:s=1280x720:d=0.1" -frames:v 1 "${path.join(outputDir, `frame${i+1}.png`)}"`, 
        { stdio: 'pipe' });
    } catch (e) {
      // 忽略错误
    }
  }
}

// 合成视频
async function composeVideo(outputDir) {
  const audioDir = path.join(outputDir, 'audio');
  const imagesDir = path.join(outputDir, 'images');
  const outputFile = path.join(outputDir, 'final.mp4');

  // 简化合成
  try {
    // 检查是否有音频和图片
    const hasAudio = fs.existsSync(path.join(audioDir, 'voice.mp3'));
    const hasImages = fs.existsSync(path.join(imagesDir, 'frame1.png'));

    if (hasImages) {
      // 创建视频
      execSync(`ffmpeg -y -loop 1 -i "${path.join(imagesDir, 'frame1.png')}" -t 5 -c:v libx264 -pix_fmt yuv420p "${outputFile}"`, 
        { stdio: 'pipe' });
    }
  } catch (e) {
    console.log('   ⚠️ 视频合成跳过');
  }
}

// 发布剧集
async function publishEpisode(args) {
  const options = parseArgs(args);
  
  console.log('\n📤 发布视频...\n');
  console.log('⚠️ 发布功能需要配置平台账号');
  console.log('   请编辑 data/platforms.json 配置账号信息\n');
}

// 显示状态
function showStatus() {
  console.log('\n📊 AI电视剧生产状态\n');

  // 列出所有剧集
  if (fs.existsSync(UNIVERS_DIR)) {
    const series = fs.readdirSync(UNIVERS_DIR).filter(f => {
      return fs.statSync(path.join(UNIVERS_DIR, f)).isDirectory();
    });

    if (series.length === 0) {
      console.log('   暂无剧集，运行 node index.js init 创建新剧\n');
    } else {
      series.forEach(name => {
        const progressFile = path.join(UNIVERS_DIR, name, 'progress.json');
        if (fs.existsSync(progressFile)) {
          const progress = JSON.parse(fs.readFileSync(progressFile));
          console.log(`   📚 ${name}`);
          console.log(`      已完成: ${progress.completed_episodes.length} 集`);
          console.log(`      当前: 第 ${progress.current_episode} 集\n`);
        }
      });
    }
  }

  // 显示输出
  if (fs.existsSync(OUTPUT_DIR)) {
    const outputs = fs.readdirSync(OUTPUT_DIR);
    if (outputs.length > 0) {
      console.log('   📁 已生成视频:');
      outputs.forEach(name => {
        const seriesOutput = path.join(OUTPUT_DIR, name);
        if (fs.statSync(seriesOutput).isDirectory()) {
          const episodes = countEpisodes(seriesOutput);
          console.log(`      ${name}: ${episodes} 集`);
        }
      });
    }
  }

  console.log('');
}

// 辅助函数
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      if (value !== true) i++;
    }
  }
  return options;
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
}

function generateId() {
  return 'universe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getVisualStyle(genre) {
  const styles = {
    '玄幻': '水墨仙侠风格',
    '悬疑': '暗黑写实风格',
    '甜宠': '明亮温馨风格',
    '搞笑': '卡通夸张风格'
  };
  return styles[genre] || '现代风格';
}

function getDefaultCharacters(genre) {
  if (genre === '玄幻') {
    return [
      {
        char_id: 'CHAR_001_主角',
        name: '林尘',
        role: '主角',
        voice: 'zh-CN-YunxiNeural',
        appearance: {
          face: '剑眉星目',
          hair: '黑色长发',
          costume: '青色长衫'
        }
      },
      {
        char_id: 'CHAR_002_女主',
        name: '苏灵儿',
        role: '女主',
        voice: 'zh-CN-XiaoxiaoNeural',
        appearance: {
          face: '清秀可人',
          hair: '白色长发',
          costume: '白色仙裙'
        }
      }
    ];
  }
  return [];
}

function getDefaultScenes(genre) {
  return [
    { scene_id: 'SCENE_001', name: '主场景', description: '主要活动区域' }
  ];
}

function getDefaultProps(genre) {
  return [
    { prop_id: 'PROP_001', name: '主要道具', description: '关键物品' }
  ];
}

function findActiveSeries() {
  if (!fs.existsSync(UNIVERS_DIR)) return null;
  
  const dirs = fs.readdirSync(UNIVERS_DIR).filter(f => {
    return fs.statSync(path.join(UNIVERS_DIR, f)).isDirectory();
  });

  if (dirs.length === 0) return null;

  // 返回第一个找到的剧集
  const name = dirs[0];
  return {
    name: name,
    path: path.join(UNIVERS_DIR, name)
  };
}

function getNextEpisode(series) {
  const progressFile = path.join(series.path, 'progress.json');
  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile));
    return progress.current_episode + 1;
  }
  return 1;
}

function updateProgress(seriesPath, episodeNum, status) {
  const progressFile = path.join(seriesPath, 'progress.json');
  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile));
    progress.current_episode = episodeNum;
    if (status === 'completed' && !progress.completed_episodes.includes(episodeNum)) {
      progress.completed_episodes.push(episodeNum);
    }
    progress.last_updated = new Date().toISOString();
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  }
}

function countEpisodes(outputDir) {
  let count = 0;
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) {
        if (f.startsWith('EP')) count++;
        else walk(fp);
      }
    });
  };
  walk(outputDir);
  return count;
}

// 运行
main().catch(console.error);
