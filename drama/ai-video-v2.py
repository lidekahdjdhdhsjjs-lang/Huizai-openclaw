#!/usr/bin/env python3
"""
AI短剧生成器 v2 - 改进版
使用真实图片 + 中文配音 + 字幕
"""

import os
import time
import subprocess
from gtts import gTTS
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO

# 配置
OUTPUT_DIR = '/home/li/short-dramas/v2'
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCRIPT = [
    {"text": "婚礼现场，未婚夫竟然带着我的闺蜜出现！", "image": "wedding"},
    {"text": "三年的感情，原来只是一个笑话。", "image": "sad"},
    {"text": "我转身离开，却被车撞飞...", "image": "car"},
    {"text": "再次睁开眼睛，我竟然回到了大学时代！", "image": "university"},
    {"text": "这一次，我决定不再相信爱情。", "image": "alone"},
    {"text": "等等，这位学长...怎么这么眼熟？", "image": "cute"},
    {"text": "原来他也重生了！前世他救了我...", "image": "shock"},
    {"text": "这一世，换我来守护他！", "image": "love"},
    {"text": "我们一起创业，一起努力。", "image": "work"},
    {"text": "曾经的闺蜜和未婚夫后悔不已。", "image": "regret"},
    {"text": "但我已经找到了真正的幸福。", "image": "happy"},
    {"text": "霸总老公，我们一起走向人生巅峰！", "image": "success"},
    {"text": "未完待续...点击关注看下一集！", "image": "follow"},
]

# 下载免费图片
def download_image(keyword, filename):
    # 使用picsum.photos免费图库
    urls = {
        "wedding": "https://picsum.photos/seed/wedding/720/1280",
        "sad": "https://picsum.photos/seed/sad/720/1280",
        "car": "https://picsum.photos/seed/car/720/1280",
        "university": "https://picsum.photos/seed/campus/720/1280",
        "alone": "https://picsum.photos/seed/alone/720/1280",
        "cute": "https://picsum.photos/seed/handsome/720/1280",
        "shock": "https://picsum.photos/seed/surprise/720/1280",
        "love": "https://picsum.photos/seed/love/720/1280",
        "work": "https://picsum.photos/seed/office/720/1280",
        "regret": "https://picsum.photos/seed/sorry/720/1280",
        "happy": "https://picsum.photos/seed/joy/720/1280",
        "success": "https://picsum.photos/seed/winner/720/1280",
        "follow": "https://picsum.photos/seed/subscribe/720/1280",
    }
    
    url = urls.get(keyword, f"https://picsum.photos/720/1280?random={keyword}")
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img = img.resize((720, 1280))
            img.save(f"{OUTPUT_DIR}/{filename}")
            print(f"  ✅ 下载成功: {keyword}")
            return True
    except Exception as e:
        print(f"  ❌ 下载失败: {keyword}")
    
    # 备用：创建带文字的图片
    create_text_image(keyword, filename)
    return False

def create_text_image(text, filename):
    img = Image.new('RGB', (720, 1280), color=(30, 30, 60))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        font = ImageFont.load_default()
    
    # 添加文字
    draw.text((360, 640), text, fill=(255, 255, 255), font=font, anchor="mm")
    img.save(f"{OUTPUT_DIR}/{filename}")

# 生成中文配音
def generate_voice(text, index):
    try:
        tts = gTTS(text=text, lang='zh-cn')
        filename = f"{OUTPUT_DIR}/voice_{index:02d}.mp3"
        tts.save(filename)
        print(f"  ✅ 配音成功: {text[:20]}...")
        return filename
    except Exception as e:
        print(f"  ❌ 配音失败，使用espeak")
        filename = f"{OUTPUT_DIR}/voice_{index:02d}.mp3"
        subprocess.run(['espeak', text, '-w', filename], capture_output=True)
        return filename

# 获取音频时长
def get_duration(filename):
    result = subprocess.run(
        ['ffprobe', '-i', filename, '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except:
        return 3.0

# 添加字幕图片
def add_subtitle(image_file, text, voice_file):
    # 获取配音时长
    duration = get_duration(voice_file)
    
    # 创建视频
    output = image_file.replace('.jpg', '.mp4')
    
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_file,
        '-i', voice_file,
        '-c:v', 'libx264', '-tune', 'stillimage',
        '-c:a', 'aac', '-b:a', '192k',
        '-shortest',
        '-vf', f"drawtext=text='{text}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=h-200:shadowcolor=black:shadowx=2:shadowy=2",
        output
    ], capture_output=True)
    
    return output

def main():
    print("=== AI短剧生成器 v2 ===\n")
    
    # 1. 下载图片
    print("1️⃣ 下载图片...")
    for i, scene in enumerate(SCRIPT):
        download_image(scene["image"], f"scene_{i:02d}.jpg")
    
    # 2. 生成配音
    print("\n2️⃣ 生成配音...")
    for i, scene in enumerate(SCRIPT):
        generate_voice(scene["text"], i)
    
    # 3. 合成视频
    print("\n3️⃣ 合成视频...")
    video_files = []
    for i, scene in enumerate(SCRIPT):
        img_file = f"{OUTPUT_DIR}/scene_{i:02d}.jpg"
        voice_file = f"{OUTPUT_DIR}/voice_{i:02d}.mp3"
        video_file = f"{OUTPUT_DIR}/clip_{i:02d}.mp4"
        
        # 使用ffmpeg合成
        subprocess.run([
            'ffmpeg', '-y',
            '-loop', '1', '-i', img_file,
            '-i', voice_file,
            '-c:v', 'libx264', '-tune', 'stillimage',
            '-c:a', 'aac', '-b:a', '128k',
            '-shortest',
            '-vf', f"drawtext=text='{scene['text']}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h-180:shadowcolor=black:shadowx=2:shadowy=2",
            video_file
        ], capture_output=True)
        
        video_files.append(video_file)
        print(f"  ✅ 场景{i+1}完成")
    
    # 4. 合并所有视频
    print("\n4️⃣ 合并视频...")
    concat_list = f"{OUTPUT_DIR}/concat.txt"
    with open(concat_list, 'w') as f:
        for v in video_files:
            f.write(f"file '{v}'\n")
    
    final_video = f"{OUTPUT_DIR}/final_drama_v2.mp4"
    subprocess.run([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list,
        '-c', 'copy', final_video
    ], capture_output=True)
    
    print(f"\n✅ 完成！")
    print(f"📁 输出: {final_video}")
    
    # 复制到桌面
    subprocess.run(['cp', final_video, '/home/li/Desktop/霸总的重生_v2.mp4'])
    print(f"📱 已复制到桌面")

if __name__ == '__main__':
    main()
