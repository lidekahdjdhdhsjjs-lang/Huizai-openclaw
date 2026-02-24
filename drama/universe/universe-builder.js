/**
 * AI电视剧宇宙档案构建器
 * 按照专业影视AI方法论构建世界观、角色、场景库
 */

const fs = require('fs');
const path = require('path');

const UNIVERSE_DIR = '/home/li/.openclaw/workspace/drama/universe';

// ============ 1. 世界观设定 ============
const world = {
  universe_id: "DRAMA_001_BAIZONG",
  universe_name: "霸总的重生",
  era: "现代",
  core_conflict: "富二代被退婚，重生后逆袭成首富，报仇并收获真爱",
  magic_system: "无",
  geography: "魔都上海、顾家豪宅、顾氏集团总部、校园",
  visual_style: "现代都市、轻奢、时尚"
};

// ============ 2. 角色身份系统 ============
const characters = {
  characters: [
    {
      char_id: "CHAR_001_GU_YANG",
      name: "顾阳",
      gender: "男",
      age: "28",
      personality: "表面玩世不恭，实则深情专一，重情重义",
      arc: "从被退婚的落魄少爷到百亿身家的商业巨头",
      appearance_fixed: {
        face: "剑眉星目，鼻梁高挺，右眉有细疤",
        hair: "黑色短发打理得一丝不苟",
        build: "修长挺拔185cm",
        costume: "高定西装，佩戴百达翡丽手表"
      },
      reference_images: []
    },
    {
      char_id: "CHAR_002_BAI_XINXIN",
      name: "白心心",
      gender: "女",
      age: "24",
      personality: "活泼开朗，正义感强，表面柔弱内心坚强",
      arc: "从普通女孩到顾阳的命中注定",
      appearance_fixed: {
        face: "鹅蛋脸，大眼睛，小酒窝",
        hair: "黑色长发，常扎马尾",
        build: "165cm，匀称",
        costume: "简约时尚"
      },
      reference_images: []
    },
    {
      char_id: "CHAR_003_LIU_FEIFEI",
      name: "刘菲菲",
      gender: "女",
      age: "26",
      personality: "绿茶心机女，嫌贫爱富",
      arc: "从背叛到后悔",
      appearance_fixed: {
        face: "锥子脸，网红脸",
        hair: "棕色大波浪",
        build: "170cm丰满",
        costume: "奢侈品堆砌"
      },
      reference_images: []
    },
    {
      char_id: "CHAR_004_ZHANG_HAO",
      name: "张昊",
      gender: "男",
      age: "30",
      personality: "顾阳的情敌，傲慢自大",
      arc: "从挑衅到被打脸",
      appearance_fixed: {
        face: "还算帅气但眼神猥琐",
        hair: "背头",
        build: "178cm",
        costume: "西装但不得体"
      },
      reference_images: []
    }
  ]
};

// ============ 3. 场景道具库 ============
const assets = {
  scenes: [
    {
      scene_id: "SCENE_001_GU_MANSION",
      description: "顾家豪宅客厅，水晶吊灯，实木家具",
      fixed_elements: "水晶吊灯、真皮沙发、落地窗"
    },
    {
      scene_id: "SCENE_002_WEDDING_VENUE",
      description: "五星级酒店婚礼现场，白玫瑰装饰",
      fixed_elements: "白玫瑰拱门、T台、司仪台"
    },
    {
      scene_id: "SCENE_003_GU_CORPORATION",
      description: "顾氏集团总部，现代化的玻璃幕墙大楼",
      fixed_elements: "前台Logo、总裁办公室、会议厅"
    },
    {
      scene_id: "SCENE_004_UNIVERSITY",
      description: "知名大学校园，樱花树下",
      fixed_elements: "樱花树、图书馆、长椅"
    },
    {
      scene_id: "SCENE_005_STREET_NIGHT",
      description: "雨夜街头，路灯下的孤独身影",
      fixed_elements: "路灯、雨滴、霓虹灯"
    }
  ],
  props: [
    {
      prop_id: "PROP_001_RING",
      description: "顾家传家戒指，钻戒款式"
    },
    {
      prop_id: "PROP_002_CONTRACT",
      description: "退婚协议合同"
    },
    {
      prop_id: "PROP_003_KEY",
      description: "顾氏集团总裁办公室钥匙"
    }
  ]
};

// ============ 4. 分集剧情大纲 (100集) ============
const episodes = [];
const episodeThemes = [
  "退婚之辱", "雨夜重生", "回到大学", "再遇真爱", "开始逆袭",
  "获取第一桶金", "进入顾氏", "职场初现", "情敌出现", "闺蜜背叛",
  "真相大白", "身份曝光", "商业大战", "复仇开始", "打脸情敌",
  "事业巅峰", "抱得美人", "大结局"
];

for (let i = 1; i <= 100; i++) {
  const themeIndex = (i - 1) % episodeThemes.length;
  episodes.push({
    episode: i,
    title: `第${i}集：${episodeThemes[themeIndex]}`,
    core_conflict: `本集核心冲突：${episodeThemes[themeIndex]}`,
    main_characters: ["CHAR_001_GU_YANG", "CHAR_002_BAI_XINXIN"],
    key_turn: `关键转折点：${i}`,
    cliffhanger: i < 100 ? `第${i+1}集预告` : "全剧终"
  });
}

// ============ 5. 进度追踪 ============
const progress = {
  total_episodes: 100,
  completed_episodes: [],
  next_episode: 1,
  last_generated: null
};

// ============ 保存所有档案 ============
function saveUniverse() {
  // 确保目录存在
  if (!fs.existsSync(UNIVERSE_DIR)) {
    fs.mkdirSync(UNIVERSE_DIR, { recursive: true });
  }
  
  // 保存世界观
  fs.writeFileSync(
    path.join(UNIVERSE_DIR, 'world.json'),
    JSON.stringify(world, null, 2)
  );
  
  // 保存角色库
  fs.writeFileSync(
    path.join(UNIVERSE_DIR, 'characters.json'),
    JSON.stringify(characters, null, 2)
  );
  
  // 保存场景道具库
  fs.writeFileSync(
    path.join(UNIVERSE_DIR, 'assets.json'),
    JSON.stringify(assets, null, 2)
  );
  
  // 保存分集大纲
  fs.writeFileSync(
    path.join(UNIVERSE_DIR, 'episodes.json'),
    JSON.stringify(episodes, null, 2)
  );
  
  // 保存进度
  fs.writeFileSync(
    path.join(UNIVERSE_DIR, 'progress.json'),
    JSON.stringify(progress, null, 2)
  );
  
  console.log('✅ 宇宙档案构建完成！');
  console.log(`📁 位置: ${UNIVERSE_DIR}`);
  console.log(`📊 总集数: ${progress.total_episodes}`);
}

// 执行
saveUniverse();

module.exports = { world, characters, assets, episodes, progress };
