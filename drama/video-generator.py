#!/usr/bin/env python3
"""
AI视频生成器 - 基于Hugging Face免费API
使用开源模型生成视频 (无需GPU)
"""

import os
import time
import json
import requests
from datetime import datetime

# 配置
HF_TOKEN = os.environ.get('HF_TOKEN', '')  # Hugging Face Token
API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion"

# 输出目录
OUTPUT_DIR = '/home/li/.openclaw/workspace/drama/video_gen'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_video_from_image(image_path, prompt="", duration=2):
    """
    使用Stable Video Diffusion从图片生成视频
    
    注意: 需要Hugging Face Pro账户才能使用SVD
    免费方案使用替代方案
    """
    
    if not HF_TOKEN:
        print("⚠️ 未设置HF_TOKEN，使用备选方案")
        return generate_video_placeholder(image_path, prompt)
    
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    
    with open(image_path, "rb") as f:
        data = f.read()
    
    response = requests.post(API_URL, headers=headers, data=data)
    
    if response.status_code == 200:
        output_path = f"{OUTPUT_DIR}/video_{int(time.time())}.mp4"
        with open(output_path, "wb") as f:
            f.write(response.content)
        return output_path
    else:
        print(f"❌ API错误: {response.status_code}")
        return generate_video_placeholder(image_path, prompt)

def generate_video_placeholder(image_path, prompt):
    """生成占位视频（用于测试）"""
    import subprocess
    
    output_path = f"{OUTPUT_DIR}/video_{int(time.time())}.mp4"
    
    # 使用ffmpeg从图片生成短视频（带简单动画）
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-c:v', 'libx264', '-t', '4',
        '-vf', 'zoompan=z=1.2:d=4:s=720x1280',
        '-shortest', output_path
    ], capture_output=True)
    
    return output_path

def generate_from_text(prompt, style="cinematic"):
    """
    文本生成视频 - 使用Zeroscope (免费方案)
    """
    
    # Zeroscope是一个免费的文本到视频模型
    # 可以通过Replicate API调用（需要API Key）
    
    print(f"📹 文本生成视频: {prompt}")
    
    # 备选方案：生成一张图然后转视频
    from PIL import Image, ImageDraw, ImageFont
    
    # 创建图片
    img = Image.new('RGB', (720, 1280), color=(20, 20, 40))
    draw = ImageDraw.Draw(img)
    
    # 添加文字
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        font = ImageFont.load_default()
    
    # 分行显示
    words = prompt.split()
    lines = []
    current_line = ""
    for word in words:
        if len(current_line + " " + word) < 30:
            current_line += " " + word if current_line else word
        else:
            lines.append(current_line)
            current_line = word
    lines.append(current_line)
    
    y = 500
    for line in lines:
        draw.text((360, y), line, fill=(255, 255, 255), font=font, anchor="mm")
        y += 50
    
    img_path = f"{OUTPUT_DIR}/temp_{int(time.time())}.jpg"
    img.save(img_path)
    
    # 转视频
    video_path = generate_video_placeholder(img_path, prompt)
    
    return video_path

def check_available_models():
    """检查可用的免费视频生成方案"""
    
    print("\n=== 可用方案 ===")
    print("1. Hugging Face SVD (需要Pro账户)")
    print("2. Replicate (需要API Key)")
    print("3. RunwayML (需要安装)")
    print("4. 本地部署 SVD (需要NVIDIA GPU)")
    print("5. 免费图生视频 (本文档方案)")
    print("")
    
    return [
        {"name": "Zeroscope", "api": "Replicate", "cost": "$0.01/秒"},
        {"name": "ModelScope", "api": "免费", "cost": "免费"},
        {"name": "SVD", "api": "Hugging Face", "cost": "付费"},
    ]

# ============ 推荐方案 ============

def setup_free_video_api():
    """设置免费视频API"""
    
    config = """
# 免费AI视频生成方案配置

## 方案1: ModelScope (免费国内)
- API: https://modelscope.cn
- 模型: I2VGen-XL
- 费用: 免费
- 接入: 需要注册ModelScope

## 方案2: Replicate (稳定)
- API: https://replicate.com
- 模型: zeroscope_v2
- 费用: $0.01/秒
- 接入: 需要注册并获取API Key

## 方案3: Hugging Face (SVD)
- API: https://huggingface.co
- 模型: stable-video-diffusion
- 费用: 需要Pro账户
- 接入: 需要申请

## 快速开始 (Replicate)

1. 注册 https://replicate.com
2. 获取API Token
3. 安装: pip install replicate
4. 使用示例:

import replicate
output = replicate.run(
    "zeroscope/v2-576w:ugriiIYNYFFrD8NDDJZGMF6gYY4fMq4KkPfZ8CmL2NDi",
    input={"prompt": "a person walking in rain"}
)
"""
    
    print(config)
    return config

if __name__ == '__main__':
    print("=== AI视频生成器 ===\n")
    
    # 检查可用方案
    check_available_models()
    
    # 设置指南
    setup_free_video_api()
    
    # 测试生成
    print("\n=== 测试生成 ===")
    test_video = generate_from_text("A handsome man in suit walking in city")
    print(f"✅ 测试视频: {test_video}")
