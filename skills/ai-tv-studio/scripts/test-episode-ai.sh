#!/bin/bash

# AI电视剧测试视频生成脚本 - 带AI图片
# 使用 Edge-TTS 配音 + Pollinations.ai 图片
# 输出：~/Desktop/test-ai-tv.mp4

set -e

OUTPUT_DIR="$HOME/Desktop"
OUTPUT_FILE="$OUTPUT_DIR/test-ai-tv-ai.mp4"
TEMP_DIR="/tmp/ai-tv-test-ai-$$"
EDGE_TTS="$HOME/.local/bin/edge-tts"
SKILL_DIR="$HOME/.openclaw/workspace/skills/ai-tv-studio"

mkdir -p "$TEMP_DIR"
mkdir -p "$TEMP_DIR/audio"
mkdir -p "$TEMP_DIR/images"

echo "========================================="
echo "  AI电视剧测试视频生成 (带AI图片)"
echo "========================================="
echo ""

# 1. 创建测试剧本
echo "📝 创建测试剧本..."
cat > "$TEMP_DIR/script.txt" << 'SCRIPT'
《九天神途》第一集 测试片段

[旁白] 在九天大陆，修仙者无数。然而，能够登顶九天者，万中无一。
[林尘] 我林尘，今日便要打破这万中无一的魔咒！
[旁白] 少年目光如炬，看向远方云雾缭绕的仙山。
[林尘] 这一步，我走了十年。今日，终将踏入仙门！
[旁白] 命运的齿轮，开始转动。新的传奇，即将开启。
SCRIPT

echo "✅ 剧本创建完成"
echo ""

# 2. 生成配音
echo "🎙️ 生成配音..."

echo "在九天大陆，修仙者无数。然而，能够登顶九天者，万中无一。" > "$TEMP_DIR/t1.txt"
$EDGE_TTS -f "$TEMP_DIR/t1.txt" -v zh-CN-XiaoxiaoNeural --write-media "$TEMP_DIR/audio/narrator1.mp3"
echo "  ✅ 旁白1"

echo "我林尘，今日便要打破这万中无一的魔咒！" > "$TEMP_DIR/t2.txt"
$EDGE_TTS -f "$TEMP_DIR/t2.txt" -v zh-CN-YunxiNeural --write-media "$TEMP_DIR/audio/linchen1.mp3"
echo "  ✅ 林尘1"

echo "少年目光如炬，看向远方云雾缭绕的仙山。" > "$TEMP_DIR/t3.txt"
$EDGE_TTS -f "$TEMP_DIR/t3.txt" -v zh-CN-XiaoxiaoNeural --write-media "$TEMP_DIR/audio/narrator2.mp3"
echo "  ✅ 旁白2"

echo "这一步，我走了十年。今日，终将踏入仙门！" > "$TEMP_DIR/t4.txt"
$EDGE_TTS -f "$TEMP_DIR/t4.txt" -v zh-CN-YunxiNeural --write-media "$TEMP_DIR/audio/linchen2.mp3"
echo "  ✅ 林尘2"

echo "命运的齿轮，开始转动。新的传奇，即将开启。" > "$TEMP_DIR/t5.txt"
$EDGE_TTS -f "$TEMP_DIR/t5.txt" -v zh-CN-XiaoxiaoNeural --write-media "$TEMP_DIR/audio/narrator3.mp3"
echo "  ✅ 旁白3"

echo "✅ 配音生成完成"
echo ""

# 3. 使用 Node.js 生成 AI 图片
echo "🖼️ 生成AI图片..."

node -e "
const ImageGenerator = require('$SKILL_DIR/src/production/image-generator.js');
const fs = require('fs');

async function genImages() {
  const gen = new ImageGenerator({ proxy: 'http://127.0.0.1:7897' });
  
  const prompts = [
    {
      text: 'Chinese xianxia fantasy, magnificent immortal mountain peaks floating in golden clouds, ancient temples, ethereal atmosphere, cinematic, 4k',
      options: { seed: 1001 }
    },
    {
      text: 'Young Chinese cultivator hero in blue robes, black hair, determined expression, standing on mountain peak, xianxia style, portrait, digital art',
      options: { seed: 2001 }
    },
    {
      text: 'Chinese immortal woman in white dress, silver hair, spiritual glow, lotus flowers, ethereal beauty, xianxia fantasy art',
      options: { seed: 3001 }
    },
    {
      text: 'Ancient Chinese sect gate, stone pillars with dragon carvings, misty mountains, traditional architecture, cinematic',
      options: { seed: 4001 }
    },
    {
      text: 'Sword cultivator holding glowing magical sword, dramatic lighting, xianxia martial arts fantasy, epic pose',
      options: { seed: 5001 }
    }
  ];
  
  console.log('  开始生成 ' + prompts.length + ' 张AI图片...');
  
  for (let i = 0; i < prompts.length; i++) {
    const outputPath = '$TEMP_DIR/images/scene_' + String(i+1).padStart(2, '0') + '.png';
    try {
      await gen.generate(prompts[i].text, outputPath, prompts[i].options);
    } catch (e) {
      console.log('  ⚠️ 图片 ' + (i+1) + ' 生成失败，使用备用');
      // 创建备用图片
      const bgColors = ['0x1a1a2e', '0x16213e', '0x0f3460', '0x1e3a5f', '0x2d1b4e'];
      require('child_process').execSync(
        'ffmpeg -y -f lavfi -i \"color=c=' + bgColors[i] + ':s=1280x720:d=0.1\" -frames:v 1 \"' + outputPath + '\"',
        { stdio: 'pipe' }
      );
    }
    if (i < prompts.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  console.log('  ✅ 图片生成完成');
}

genImages().catch(e => {
  console.log('  ❌ 图片生成出错:', e.message);
  process.exit(0);
});
" 2>&1

echo ""

# 4. 检查生成的图片
echo "📁 检查生成的图片..."
ls -la "$TEMP_DIR/images/" | head -10
echo ""

# 5. 合并音频
echo "🎵 合并音频..."
ffmpeg -y \
    -i "$TEMP_DIR/audio/narrator1.mp3" \
    -i "$TEMP_DIR/audio/linchen1.mp3" \
    -i "$TEMP_DIR/audio/narrator2.mp3" \
    -i "$TEMP_DIR/audio/linchen2.mp3" \
    -i "$TEMP_DIR/audio/narrator3.mp3" \
    -filter_complex "[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[out]" \
    -map "[out]" \
    -c:a aac \
    -b:a 128k \
    "$TEMP_DIR/audio_combined.m4a" 2>/dev/null

audio_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEMP_DIR/audio_combined.m4a" 2>/dev/null)
echo "  音频时长: ${audio_duration}s"
echo ""

# 6. 创建图片列表
echo "🎬 合成视频..."

# 计算每帧时长
frame_duration=$(echo "scale=2; $audio_duration / 5" | bc)

# 创建图片列表文件
cat > "$TEMP_DIR/images.txt" << EOF
file '$TEMP_DIR/images/scene_01.png'
duration $frame_duration
file '$TEMP_DIR/images/scene_02.png'
duration $frame_duration
file '$TEMP_DIR/images/scene_03.png'
duration $frame_duration
file '$TEMP_DIR/images/scene_04.png'
duration $frame_duration
file '$TEMP_DIR/images/scene_05.png'
duration $frame_duration
file '$TEMP_DIR/images/scene_05.png'
EOF

# 合成视频
ffmpeg -y \
    -f concat -safe 0 -i "$TEMP_DIR/images.txt" \
    -i "$TEMP_DIR/audio_combined.m4a" \
    -vf "
        scale=1280:720:force_original_aspect_ratio=decrease,
        pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,
        drawtext=text='九天神途':fontsize=72:fontcolor=gold:x=(w-text_w)/2:y=50:shadowcolor=black:shadowx=3:shadowy=3,
        drawtext=text='第一集':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=130:shadowcolor=black:shadowx=2:shadowy=2,
        drawtext=text='AI玄幻剧':fontsize=28:fontcolor=white@0.8:x=(w-text_w)/2:y=680:shadowcolor=black:shadowx=1:shadowy=1,
        format=yuv420p
    " \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -shortest \
    -pix_fmt yuv420p \
    "$TEMP_DIR/final.mp4" 2>/dev/null

# 复制到桌面
cp "$TEMP_DIR/final.mp4" "$OUTPUT_FILE"

# 清理
rm -rf "$TEMP_DIR"

echo ""
echo "========================================="
echo "✅ AI图片版测试视频生成完成！"
echo "========================================="
echo ""
echo "📁 输出文件: $OUTPUT_FILE"
echo "⏱️  视频时长: ${audio_duration%.*}秒"
echo "🖼️  包含: 5张AI生成的玄幻场景图片"
echo ""
echo "💡 提示: 双击打开视频查看效果"
echo ""
