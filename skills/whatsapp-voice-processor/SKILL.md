---
name: whatsapp-voice-processor
description: WhatsApp语音消息处理 - 转换OGG音频为文字或MP3，使用Whisper进行语音识别
---

---
name: whatsapp-voice-processor
description: 处理WhatsApp语音消息，转换为文字或MP3格式
metadata: {"openclaw":{"emoji":"🎤","os":["linux","darwin"]}}
triggers:
  - pattern: "语音|voice|音频|audio"
    description: "处理语音消息"
---

# WhatsApp Voice Processor

处理WhatsApp收到的OGG格式语音消息。

## 功能

1. **OGG转MP3** - 将OGG音频转换为MP3
2. **语音识别** - 使用Whisper识别语音内容

## 安装依赖

```bash
# 安装ffmpeg
sudo apt install ffmpeg

# 安装Python库
pip install whisper
```

## 使用方法

### 转换OGG为MP3
```bash
ffmpeg -i input.ogg -acodec libmp3lame -q:a 2 output.mp3
```

### 语音识别
```bash
whisper audio.mp3 --language Chinese
```

## 自动化

创建处理脚本处理收到的语音文件。

