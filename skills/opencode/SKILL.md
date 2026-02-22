---
name: opencode
description: 使用OpenCode AI终端编码助手执行代码任务、分析和对话
metadata:
  openclaw:
    requires:
      bins:
        - opencode
    os:
      - linux
      - darwin
---

# OpenCode - AI终端编码助手

## 简介

OpenCode是一个基于Go的终端AI助手，提供智能编码辅助、代码分析和LSP集成。

## 前置要求

- OpenCode已安装 (npm install -g opencode-ai)
- PATH需要包含: `~/.local/share/opencode/bin`
- **无需API Key！有免费模型**

## 快速使用

```bash
# 添加PATH (加到 ~/.bashrc)
export PATH="$HOME/.local/share/opencode/bin:$PATH"

# 查看可用模型
opencode models

# 使用免费MiniMax模型
opencode -m opencode/minimax-m2.5-free run "你的问题"

# 常用免费模型:
# - opencode/minimax-m2.5-free (MiniMax M2.5免费版)
# - opencode/kimi-k2.5-free (Kimi K2.5免费版)
# - opencode/gpt-5-nano (GPT-5 nano)
```

## 工具 (可被OpenClaw调用)

### opencode_chat
- 用途: 与OpenCode进行AI对话
- 参数: 
  - prompt (string) - 要询问的问题
  - model (string, optional) - 使用opencode/minimax-m2.5-free

### opencode_code_analysis  
- 用途: 分析代码文件或目录
- 参数: path (string) - 代码路径

## 注意事项

- 免费模型足够日常编码使用
- 比付费API更稳定
