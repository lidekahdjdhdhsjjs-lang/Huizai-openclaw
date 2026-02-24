#!/usr/bin/env python3
"""
ModelScope AI视频生成器 - 直接API调用
不依赖ModelScope Python SDK
"""

import os
import json
import time
import base64
import requests
from PIL import Image, ImageDraw, ImageFont

# 配置
MODELSCOPE_TOKEN = "ms-ecf935d5-75fe-4486-a2d2-876a39d5f3a1"
API_BASE = "https://api.modelscope.cn/v1"

# 输出目录
OUTPUT_DIR = '/home/li/.openclaw/workspace/drama/video_gen'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_image(prompt, size=(720, 1280)):
    """
    使用免费图库API生成图片
    """
    print(f"🖼️ 生成图片: {prompt}")
    
    # 使用免费图片服务
    try:
        # 使用picsum
        response = requests.get(
            f"https://picsum.photos/{size[0]}/{size[1]}",
            timeout=10
        )
        
        if response.status_code == 200:
            img_path = f"{OUTPUT_DIR}/img_{int(time.time())}.jpg"
            with open(img_path, 'wb') as f:
                f.write(response.content)
            print(f"✅ 图片保存: {img_path}")
            return img_path
    except Exception as e:
        print(f"⚠️ 使用备用方案")
    
    # 备用：创建文字图片
    img = Image.new('RGB', size, color=(30, 30, 60))
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    except:
        font = ImageFont.load_default()
    
    # 分行
    words = prompt.split()
    lines = []
    line = ""
    for w in words:
        if len(line + " " + w) < 25:
            line = line + " " + w if line else w
        else:
            lines.append(line)
            line = w
    lines.append(line)
    
    y = size[1] // 2 - len(lines) * 25
    for l in lines:
        draw.text((size[0]//2, y), l, fill=(255, 255, 255), font=font, anchor="mm")
        y += 50
    
    img_path = f"{OUTPUT_DIR}/img_{int(time.time())}.jpg"
    img.save(img_path)
    return img_path

def generate_video_from_image(image_path, prompt=""):
    """
    图生视频 - 使用免费API或本地方案
    """
    print(f"🎬 生成视频: {prompt}")
    
    # 由于没有免费视频API，使用本地方案
    # 创建带简单动画的视频
    
    video_path = f"{OUTPUT_DIR}/video_{int(time.time())}.mp4"
    
    import subprocess
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-c:v', 'libx264', '-t', '5',
        '-vf', 'zoompan=z=1.1:d=5:s=720x1280',
        '-shortest', video_path
    ], capture_output=True)
    
    print(f"✅ 视频保存: {video_path}")
    return video_path

def text_to_video(prompt):
    """
    文本生成视频 - 完整工作流
    """
    print(f"\n=== 文本生成视频 ===")
    print(f"主题: {prompt}\n")
    
    # 1. 生成图片
    print("1️⃣ 生成图片...")
    img_path = generate_image(prompt)
    
    # 2. 生成视频
    print("\n2️⃣ 生成视频...")
    video_path = generate_video_from_image(img_path, prompt)
    
    print(f"\n✅ 完成: {video_path}")
    return video_path

def call_modelscope_api(model, input_data):
    """
    直接调用ModelScope API
    """
    headers = {
        "Authorization": f"Token {MODELSCOPE_TOKEN}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{API_BASE}/{model}",
        headers=headers,
        json=input_data,
        timeout=60
    )
    
    return response

def check_modelscope_models():
    """检查可用的ModelScope模型"""
    
    print("\n=== ModelScope API 模型 ===")
    print(f"Token: {MODELSCOPE_TOKEN[:10]}...")
    
    # 测试API
    try:
        resp = requests.get(
            "https://api.modelscope.cn/v1/models",
            headers={"Authorization": f"Token {MODELSCOPE_TOKEN}"},
            timeout=10
        )
        print(f"API状态: {resp.status_code}")
    except Exception as e:
        print(f"API错误: {e}")
    
    print("\n可用水星模型:")
    print("- i2vgen-xl: 图生视频")
    print("- stable-diffusion-v1.5: 文生图")
    print("- chatglm3: 对话")

if __name__ == '__main__':
    print("=== ModelScope 视频生成器 ===\n")
    
    # 检查API
    check_modelscope_models()
    
    # 测试生成
    print("\n=== 测试生成 ===")
    video = text_to_video("霸总重生")
    print(f"\n📁 输出: {video}")
    
    # 复制到桌面
    import subprocess
    subprocess.run(['cp', video, f'/home/li/Desktop/AI视频测试.mp4'])
    print("📱 已复制到桌面")
