#!/bin/bash
# 语音录制脚本

DURATION=${1:-5}
OUTPUT=/tmp/voice_input.wav

echo "正在录音 ${DURATION} 秒..."
arecord -d $DURATION -f cd -t wav $OUTPUT 2>/dev/null

if [ -f "$OUTPUT" ]; then
    echo "录音完成: $OUTPUT"
    ls -lh $OUTPUT
else
    echo "录音失败"
    exit 1
fi
