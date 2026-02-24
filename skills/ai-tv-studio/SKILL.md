---
name: ai-tv-studio
description: AI电视剧全自动生产系统 - 支持长篇玄幻/悬疑/甜宠剧的剧本生成、配音、画面、合成、发布全流程自动化
tags: [video, ai, automation, tv-series, production, creativity]
version: 1.0.0
author: OpenClaw
---

# AI电视剧全自动生产系统

**"从剧本到发布，全程自动化"**

将《九天神途》等长篇AI剧的生产流程完全自动化。支持每部剧2-3季、每季500-600集的大规模生产。

## 🎯 核心功能

### 1. 宇宙档案系统 (解决人物一致性)
```
data/universes/{剧名}/
├── world.json          # 世界观设定
├── characters.json     # 角色ID向量 (锁脸核心)
├── assets.json         # 场景/道具库
├── episodes.json       # 分集大纲
└── progress.json       # 进度追踪
```

### 2. 生产流水线
```
剧本生成 → 分镜拆分 → 配音生成 → 画面生成 → 视频合成 → 发布
    ↓          ↓          ↓          ↓          ↓        ↓
 OpenClaw   OpenClaw   Edge-TTS   云端免费    FFmpeg   Playwright
   LLM        LLM       (免费)      API      (已安装)   (免费)
```

### 3. 发布平台
- B站
- 抖音/TikTok (多平台同步)

## 📋 使用方法

### 快速测试
```bash
# 生成一个测试视频 (约30秒)
node index.js test
```

### 初始化新剧
```bash
node index.js init --name "九天神途" --genre 玄幻 --seasons 3 --episodes 500
```

### 生成单集
```bash
node index.js produce --episode 1
```

### 批量生产
```bash
node index.js produce --batch 10
```

### 发布视频
```bash
node index.js publish --platform bilibili --episode 1
```

### 查看状态
```bash
node index.js status
```

## ⚙️ 配置

### 角色配音映射
编辑 `data/universes/{剧名}/characters.json`:
```json
{
  "characters": [{
    "char_id": "CHAR_001_林尘",
    "name": "林尘",
    "voice": "zh-CN-YunxiNeural",
    "appearance": {
      "face": "剑眉星目，棱角分明",
      "hair": "黑色长发，青色发带",
      "costume": "青色长衫"
    }
  }]
}
```

### 可用配音角色
| 角色类型 | 推荐声音 |
|---------|---------|
| 男主角 | zh-CN-YunxiNeural |
| 女主角 | zh-CN-XiaoxiaoNeural |
| 老者 | zh-CN-YunjianNeural |
| 反派 | zh-CN-YunyangNeural |
| 旁白 | zh-CN-XiaoxiaoNeural |

## 🔧 技术栈

| 功能 | 方案 | 成本 |
|------|------|------|
| 剧本生成 | OpenClaw LLM | 免费 |
| 配音 | Edge-TTS | 免费 |
| 画面 | HuggingFace Spaces | 免费 |
| 合成 | FFmpeg | 免费 |
| 发布 | Playwright | 免费 |

## 📊 性能指标

- **单集生产时间**: 约30分钟
- **每日产能**: 2-3集 (自动)
- **存储需求**: ~500MB/集
- **人力投入**: 0 (全自动)

## 📁 文件结构

```
ai-tv-studio/
├── index.js              # 主入口
├── SKILL.md              # 本文档
├── package.json          # NPM配置
│
├── src/
│   ├── universe/         # 宇宙档案模块
│   │   ├── world-builder.js
│   │   ├── character-manager.js
│   │   └── episode-planner.js
│   │
│   ├── production/       # 生产模块
│   │   ├── script-writer.js
│   │   ├── storyboard-maker.js
│   │   ├── voice-synthesizer.js
│   │   ├── image-generator.js
│   │   └── video-composer.js
│   │
│   └── publish/          # 发布模块
│       ├── bilibili.js
│       ├── douyin.js
│       └── scheduler.js
│
├── scripts/
│   ├── test-episode.sh   # 测试脚本
│   ├── setup.sh          # 环境安装
│   └── batch-produce.sh  # 批量生产
│
├── templates/
│   ├── universe/         # 宇宙档案模板
│   └── prompts/          # AI提示词模板
│
└── data/
    ├── universes/        # 各剧的宇宙档案
    └── output/           # 生成的视频
```

## 🚀 快速开始

1. **安装依赖**
   ```bash
   npm install
   # 或
   ./scripts/setup.sh
   ```

2. **运行测试**
   ```bash
   node index.js test
   ```

3. **创建新剧**
   ```bash
   node index.js init --name "我的剧" --genre 玄幻
   ```

4. **生成第一集**
   ```bash
   node index.js produce --episode 1
   ```

## ⚠️ 注意事项

1. **首次运行**会自动安装 edge-tts
2. **视频生成**需要 ffmpeg (已预装)
3. **大规模生产**建议配置定时任务
4. **发布功能**需要配置平台账号

## 📝 Cron 定时任务

```json
{
  "06:00": {
    "name": "ai-tv-daily-produce",
    "prompt": "执行 ai-tv-studio produce --next，自动生成下一集"
  },
  "18:00": {
    "name": "ai-tv-daily-publish", 
    "prompt": "执行 ai-tv-studio publish --pending，发布待发布剧集"
  }
}
```

---

**已生成测试视频**: `~/Desktop/test-ai-tv.mp4` (26秒)
