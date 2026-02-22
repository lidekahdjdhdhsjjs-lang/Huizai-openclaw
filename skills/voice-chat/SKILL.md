# Voice Chat Skill

语音对话技能，通过麦克风和扬声器与用户实时语音交流。

## 功能

- 语音识别 (STT) - 录制音频
- 语音合成 (TTS) - 文字转语音
- 实时语音对话

## 工具

### voice_listen
监听麦克风输入，识别语音

**参数:**
- duration: 录音时长（秒），默认5

**示例:**
```
voice_listen duration=5
```

### voice_speak
将文本转换为语音播放

**参数:**
- text: 要播放的文本
- channel: 音频通道（可选）

**示例:**
```
voice_speak text="你好！我是亮仔！"
```

### voice_record
录制音频到文件

**示例:**
```
voice_record path="/tmp/my_voice.wav" duration=10
```

### voice_play
播放音频文件

**示例:**
```
voice_play path="/tmp/my_voice.wav"
```

## 使用示例

```
用户: Voice speak "你好" 
→ 使用 tts 工具生成语音并播放

用户: 录制我的声音
→ voice_record duration=5
→ 录音保存到 /tmp/voice_input.wav
```

## 音频设备检查

```bash
# 列出音频设备
pactl list short sources   # 输入设备
pactl list short sinks     # 输出设备

# 测试录音
arecord -d 3 /tmp/test.wav

# 测试播放
aplay /tmp/test.wav
```

## 内部命令

```bash
# 录音
arecord -d <秒数> -f cd -t wav <输出文件>

# 播放
aplay <音频文件>
paplay <音频文件>  # PulseAudio
```

## 技术栈

- 录音: arecord (ALSA)
- 播放: aplay / paplay
- TTS: OpenClaw tts 工具
- STT: 可选配 Whisper/阿里云/讯飞
