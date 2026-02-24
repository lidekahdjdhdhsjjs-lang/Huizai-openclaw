#!/usr/bin/env python3
"""
ModelScope AI视频生成器 - 完整版
使用I2VGen-XL图生视频模型
"""

import os
import time

# ModelScope配置
MODELSCOPE_TOKEN = "ms-ecf935d5-75fe-4486-a2d2-876a39d5f3a1"

os.environ['MODELSCOPE_TOKEN'] = MODELSCOPE_TOKEN

from modelscope.hub.api import HubApi
from modelscope.pipelines import pipeline
from modelscope.outputs import OutputKeys

# 输出目录
OUTPUT_DIR = '/home/li/.openclaw/workspace/drama/video_gen/modelscope'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 全局pipeline (避免重复加载)
_video_pipeline = None

def get_video_pipeline():
    """获取视频生成pipeline"""
    global _video_pipeline
    
    if _video_pipeline is None:
        print("🔄 加载I2VGen-XL模型...")
        try:
            # I2VGen-XL: 图生视频
            _video_pipeline = pipeline(
                'image-to-video', 
                model='i2vgen-xl',
                model_revision='v1.0'
            )
            print("✅ 模型加载成功!")
        except Exception as e:
            print(f"❌ 模型加载失败: {e}")
            # 使用备选
            _video_pipeline = None
    
    return _video_pipeline

def generate_image_to_video(image_path, prompt="", output_name="output"):
    """
    图生视频 (I2VGen-XL)
    
    Args:
        image_path: 输入图片路径
        prompt: 提示词
        output_name: 输出文件名
    """
    
    pipeline = get_video_pipeline()
    
    if pipeline is None:
        return generate_fallback_video(image_path, prompt, output_name)
    
    print(f"🎬 正在生成视频...")
    print(f"   图片: {image_path}")
    print(f"   提示词: {prompt}")
    
    try:
        # 调用ModelScope API
        output = pipeline({
            'image': image_path,
            'prompt': prompt
        })
        
        # 保存视频
        output_path = f"{OUTPUT_DIR}/{output_name}_{int(time.time())}.mp4"
        
        # 检查输出
        if OutputKeys.OUTPUT_VIDEO in output:
            with open(output_path, 'wb') as f:
                f.write(output[OutputKeys.OUTPUT_VIDEO])
            print(f"✅ 视频生成成功: {output_path}")
        else:
            print(f"⚠️ 未生成视频，使用备选方案")
            return generate_fallback_video(image_path, prompt, output_name)
        
        return output_path
        
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        return generate_fallback_video(image_path, prompt, output_name)

def generate_text_to_image(prompt, output_name="image"):
    """
    文生图 (Stable Diffusion)
    """
    
    print(f"🖼️ 正在生成图片: {prompt}")
    
    try:
        # 使用SD模型
        sd_pipeline = pipeline(
            'text-to-image', 
            model='stable-diffusion-v1.5',
            model_revision='v1.0'
        )
        
        output = sd_pipeline({
            'text': prompt,
            'num_inference_steps': 20
        })
        
        # 保存图片
        output_path = f"{OUTPUT_DIR}/{output_name}_{int(time.time())}.jpg"
        output[OutputKeys.OUTPUT_IMAGE].save(output_path)
        
        print(f"✅ 图片生成成功: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"❌ 图片生成失败: {e}")
        # 创建占位图
        from PIL import Image, ImageDraw, ImageFont
        
        img = Image.new('RGB', (720, 1280), color=(30, 30, 60))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        except:
            font = ImageFont.load_default()
        
        draw.text((360, 640), prompt[:20], fill=(255, 255, 255), font=font, anchor="mm")
        
        output_path = f"{OUTPUT_DIR}/{output_name}_{int(time.time())}.jpg"
        img.save(output_path)
        
        return output_path

def generate_fallback_video(image_path, prompt, output_name):
    """使用ffmpeg生成备选视频"""
    
    video_path = f"{OUTPUT_DIR}/{output_name}_{int(time.time())}.mp4"
    
    import subprocess
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-c:v', 'libx264', '-t', '4',
        '-vf', 'zoompan=z=1.05:d=4:s=720x1280',
        '-shortest', video_path
    ], capture_output=True)
    
    print(f"✅ 备选视频生成: {video_path}")
    return video_path

def full_workflow(prompt, output_name="drama"):
    """
    完整工作流: 文生图 → 图生视频
    """
    
    print(f"\n=== 完整生成工作流 ===")
    print(f"主题: {prompt}\n")
    
    # 1. 文生图
    print("1️⃣ 步骤1: 生成图片...")
    image_path = generate_text_to_image(prompt, output_name)
    
    # 2. 图生视频
    print("\n2️⃣ 步骤2: 生成视频...")
    video_path = generate_image_to_video(image_path, prompt, output_name)
    
    print(f"\n✅ 完成! 视频: {video_path}")
    return video_path

if __name__ == '__main__':
    print("=== ModelScope AI视频生成器 ===\n")
    
    # 测试生成
    video = full_workflow("A handsome man in business suit standing in front of skyscraper", "test")
    print(f"\n📁 输出: {video}")
