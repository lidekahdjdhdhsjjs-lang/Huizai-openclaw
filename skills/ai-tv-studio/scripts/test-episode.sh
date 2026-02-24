#!/bin/bash

# AI电视剧测试视频生成脚本
# 使用 Edge-TTS 生成配音
# 输出：~/Desktop/test-ai-tv.mp4

set -e

OUTPUT_DIR="$HOME/Desktop"
OUTPUT_FILE="$OUTPUT_DIR/test-ai-tv.mp4"
TEMP_DIR="/tmp/ai-tv-test-$$"
EDGE_TTS="$HOME/.local/bin/edge-tts"

mkdir -p "$TEMP_DIR"

echo "========================================="
echo "  AI电视剧测试视频生成"
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
echo "🎙️ 生成配音 (使用 Edge-TTS)..."

# 旁白 (使用女声)
echo "在九天大陆，修仙者无数。然而，能够登顶九天者，万中无一。" > "$TEMP_DIR/t1.txt"
$EDGE_TTS -f "$TEMP_DIR/t1.txt" -v zh-CN-XiaoxiaoNeural --write-media "$TEMP_DIR/narrator1.mp3"
echo "  ✅ 旁白1"

# 林尘 (使用男声)
echo "我林尘，今日便要打破这万中无一的魔咒！" > "$TEMP_DIR/t2.txt"
$EDGE_TTS -f "$TEMP_DIR/t2.txt" -v zh-CN-YunxiNeural --write-media "$TEMP_DIR/linchen1.mp3"
echo "  ✅ 林尘1"

# 旁白
echo "少年目光如炬，看向远方云雾缭绕的仙山。" > "$TEMP_DIR/t3.txt"
$EDGE_TTS -f "$TEMP_DIR/t3.txt" -v zh-CN-XiaoxiaoNeural --write-media "$TEMP_DIR/narrator2.mp3"
echo "  ✅ 旁白2"

# 林尘
echo "这一步，我走了十年。今日，终将踏入仙门！" > "$TEMP_DIR/t4.txt"
$EDGE_TTS -f "$TEMP_DIR/t4.txt" -v zh-CN-YunxiNeural --write-media "$TEMP_DIR/linchen2.mp3"
echo "  ✅ 林尘2"

# 旁白
echo "命运的齿轮，开始转动。新的传奇，即将开启。" > "$TEMP_DIR/t5.txt"
$EDGE_TTS -f "$TEMP_DIR/t5.txt" -v zh-CN-XiaoxiaoNeural --write-media "$TEMP_DIR/narrator3.mp3"
echo "  ✅ 旁白3"

echo "✅ 配音生成完成"
echo ""

# 3. 创建视频画面
echo "🖼️ 创建视频画面..."

# 创建带文字的图片帧
create_frame() {
    local output="$1"
    local text="$2"
    local subtext="$3"
    local bg_color="$4"
    
    ffmpeg -y -f lavfi -i "color=c=$bg_color:s=1280x720:d=0.1" \
        -vf "drawtext=text='九天神途':fontsize=72:fontcolor=gold:x=(w-text_w)/2:y=80:shadowcolor=black:shadowx=3:shadowy=3,drawtext=text='$text':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=2:shadowy=2,drawtext=text='$subtext':fontsize=24:fontcolor=gray:x=(w-text_w)/2:y=620:shadowcolor=black:shadowx=1:shadowy=1" \
        -frames:v 1 "$output" 2>/dev/null
}

# 创建各帧
create_frame "$TEMP_DIR/frame1.png" "第一集 觉醒" "九天大陆" 0x1a1a2e
create_frame "$TEMP_DIR/frame2.png" "旁白" "在九天大陆，修仙者无数" 0x16213e
create_frame "$TEMP_DIR/frame3.png" "林尘" "打破魔咒的决心" 0x0f3460
create_frame "$TEMP_DIR/frame4.png" "仙山之巅" "命运的齿轮" 0x1a1a2e
create_frame "$TEMP_DIR/frame5.png" "待续" "新的传奇即将开启" 0x16213e

echo "✅ 画面创建完成"
echo ""

# 4. 获取音频时长
echo "⏱️ 计算时长..."

total_duration=0
for f in narrator1 linchen1 narrator2 linchen2 narrator3; do
    if [ -f "$TEMP_DIR/${f}.mp3" ]; then
        dur=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEMP_DIR/${f}.mp3" 2>/dev/null)
        echo "  ${f}.mp3: ${dur}s"
        total_duration=$(echo "$total_duration + $dur" | bc)
    fi
done

echo "  总时长: ${total_duration}s"
echo ""

# 5. 合成视频
echo "🎬 合成最终视频..."

# 合并所有音频
ffmpeg -y \
    -i "$TEMP_DIR/narrator1.mp3" \
    -i "$TEMP_DIR/linchen1.mp3" \
    -i "$TEMP_DIR/narrator2.mp3" \
    -i "$TEMP_DIR/linchen2.mp3" \
    -i "$TEMP_DIR/narrator3.mp3" \
    -filter_complex "[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[out]" \
    -map "[out]" \
    -c:a aac \
    -b:a 128k \
    "$TEMP_DIR/audio_combined.m4a" 2>/dev/null

# 获取合并后的音频时长
audio_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEMP_DIR/audio_combined.m4a" 2>/dev/null)
echo "  合并音频时长: ${audio_duration}s"

# 计算每帧的时长
frame_duration=$(echo "scale=2; $audio_duration / 5" | bc)
echo "  每帧时长: ${frame_duration}s"

# 创建图片列表
cat > "$TEMP_DIR/images.txt" << EOF
file '$TEMP_DIR/frame1.png'
duration $frame_duration
file '$TEMP_DIR/frame2.png'
duration $frame_duration
file '$TEMP_DIR/frame3.png'
duration $frame_duration
file '$TEMP_DIR/frame4.png'
duration $frame_duration
file '$TEMP_DIR/frame5.png'
duration $frame_duration
file '$TEMP_DIR/frame5.png'
EOF

# 创建视频 (图片 + 音频)
ffmpeg -y \
    -f concat -safe 0 -i "$TEMP_DIR/images.txt" \
    -i "$TEMP_DIR/audio_combined.m4a" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
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
echo "✅ 测试视频生成完成！"
echo "========================================="
echo ""
echo "📁 输出文件: $OUTPUT_FILE"
echo "⏱️  视频时长: ${audio_duration%.*}秒"
echo ""
echo "💡 提示: 双击打开视频查看效果"
echo ""
