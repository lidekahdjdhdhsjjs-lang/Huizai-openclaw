#!/usr/bin/env python3
"""
AI短剧单集生成器 v2
基于阿里云百炼API: 文本生成 + 图片生成 + TTS
时长: 3分钟 (18镜头, 10秒/镜头)
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from aliyun_api import AliyunAPI, get_voice_for_gender
from prompt_template import build_script_prompt, build_image_prompt, parse_script_response

# 配置
UNIVERSE_DIR = '/home/li/.openclaw/workspace/drama/universe'
OUTPUT_DIR = '/home/li/.openclaw/workspace/drama/output'
DESKTOP_DIR = '/home/li/Desktop'

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 角色音色映射
CHAR_VOICE_MAP = {}


def load_universe():
    """加载宇宙档案"""
    with open(f'{UNIVERSE_DIR}/world.json', encoding='utf-8') as f:
        world = json.load(f)
    with open(f'{UNIVERSE_DIR}/characters.json', encoding='utf-8') as f:
        chars_data = json.load(f)
    with open(f'{UNIVERSE_DIR}/episodes.json', encoding='utf-8') as f:
        episodes = json.load(f)
    with open(f'{UNIVERSE_DIR}/progress.json', encoding='utf-8') as f:
        progress = json.load(f)
    
    return world, chars_data['characters'], episodes, progress


def load_char_voice_map(characters):
    """加载角色音色映射"""
    global CHAR_VOICE_MAP
    for char in characters:
        name = char['name']
        gender = char.get('gender', '女')
        CHAR_VOICE_MAP[name] = get_voice_for_gender(gender)
    print(f"  🎤 角色音色映射: {CHAR_VOICE_MAP}")


def get_prev_summary(progress):
    """获取上集剧情摘要"""
    completed = progress.get('completed_episodes', [])
    if not completed:
        return ""
    
    last_ep = completed[-1]
    # 读取上集的剧本文件
    ep_dir = f"{OUTPUT_DIR}/EP{last_ep:03d}"
    script_file = f"{ep_dir}/script.json"
    
    if os.path.exists(script_file):
        with open(script_file, encoding='utf-8') as f:
            script_data = json.load(f)
        # 提取关键信息作为摘要
        summary = f"第{last_ep}集: {script_data.get('title', '')}"
        return summary
    
    return f"第{last_ep}集已生成"


def generate_script(api, episode_info, universe, characters, prev_summary):
    """1. 生成剧本 (通义千问)"""
    print("\n📝 步骤1: 生成剧本...")
    
    prompt = build_script_prompt(episode_info, universe, characters, prev_summary)
    
    try:
        # 调用API生成剧本
        system_prompt = """你是一个专业短视频剧编剧，擅长创作抖音爆款短剧。
输出格式: 严格的JSON数组，每个镜头包含shot, duration, scene, characters, visual_prompt, dialogue, emotion, camera, sound字段。
"""
        response = api.generate_text(prompt, system_prompt)
        
        # 解析JSON - 可能返回list或dict
        result = parse_script_response(response)
        
        if isinstance(result, list):
            shots = result
        elif isinstance(result, dict) and 'shots' in result:
            shots = result['shots']
        else:
            shots = None
        
        if not shots:
            print("  ⚠️ 剧本解析失败，使用默认模板")
            return create_default_script(episode_info)
        
        print(f"  ✅ 剧本生成成功: {len(shots)}个镜头")
        
        # 保存剧本
        script_data = {
            "episode": episode_info['episode'],
            "title": episode_info['title'],
            "shots": shots,
            "generated": datetime.now().isoformat()
        }
        
        return script_data
        
    except Exception as e:
        print(f"  ❌ 剧本生成失败: {e}")
        return create_default_script(episode_info)


def create_default_script(episode_info):
    """创建默认剧本模板"""
    shots = []
    for i in range(18):
        shot = {
            "shot": i + 1,
            "duration": "10秒",
            "scene": f"场景{i+1}",
            "characters": ["顾阳"],
            "visual_prompt": f"A handsome man in modern business suit, scene {i+1}, high quality",
            "dialogue": f"这是第{i+1}个镜头的对白",
            "emotion": "neutral",
            "camera": "中景",
            "sound": "背景音乐"
        }
        shots.append(shot)
    return {
        "episode": episode_info['episode'],
        "title": episode_info['title'],
        "shots": shots,
        "generated": datetime.now().isoformat()
    }


def generate_images(api, script_data, characters):
    """2. 生成图片 (万相API) - 并行"""
    print("\n🖼️ 步骤2: 生成图片...")
    
    shots = script_data.get('shots', [])
    
    # 构建角色外貌映射
    char_appearance = {}
    for char in characters:
        char_appearance[char['name']] = char.get('appearance_fixed', {})
    
    # 生成提示词
    prompts = []
    for shot in shots:
        prompt = shot.get('visual_prompt', '')
        if not prompt:
            # 使用scene字段作为后备
            prompt = f"{shot.get('scene', 'scene')}, high quality, realistic, 9:16"
        prompts.append(prompt)
    
    # 并行生成图片
    print(f"  📸 准备生成 {len(prompts)} 张图片...")
    
    try:
        image_urls = api.generate_images_parallel(prompts, size="720*1280", batch_size=6)
        
        # 下载图片
        image_paths = []
        ep_num = script_data['episode']
        
        for i, url in enumerate(image_urls):
            if url:
                img_path = f"{OUTPUT_DIR}/EP{ep_num:03d}/images/shot_{i+1:02d}.jpg"
                try:
                    resp = requests.get(url, timeout=30)
                    os.makedirs(os.path.dirname(img_path), exist_ok=True)
                    with open(img_path, 'wb') as f:
                        f.write(resp.content)
                    image_paths.append(img_path)
                    print(f"    镜头{i+1}: ✅")
                except Exception as e:
                    print(f"    镜头{i+1}: ❌ {e}")
                    image_paths.append(None)
            else:
                image_paths.append(None)
        
        # 统计
        success_count = sum(1 for p in image_paths if p)
        print(f"  ✅ 图片生成完成: {success_count}/{len(prompts)}")
        
        return image_paths
        
    except Exception as e:
        print(f"  ❌ 图片生成失败: {e}")
        return [None] * len(prompts)


def generate_voice(api, script_data, characters):
    """3. 生成配音 (TTS)"""
    print("\n🎤 步骤3: 生成配音...")
    
    shots = script_data.get('shots', [])
    ep_num = script_data['episode']
    voice_dir = f"{OUTPUT_DIR}/EP{ep_num:03d}/voices"
    os.makedirs(voice_dir, exist_ok=True)
    
    voice_files = []
    
    # 按角色分组生成配音
    for i, shot in enumerate(shots):
        dialogue = shot.get('dialogue', '').strip()
        if not dialogue:
            dialogue = " "
        
        # 确定音色
        chars = shot.get('characters', [])
        if chars and chars[0] in CHAR_VOICE_MAP:
            voice = CHAR_VOICE_MAP[chars[0]]
        else:
            voice = "xiaoyun"  # 默认女声
        
        output_path = f"{voice_dir}/shot_{i+1:02d}.mp3"
        
        try:
            api.generate_tts(dialogue, voice, output_path)
            voice_files.append(output_path)
            print(f"    镜头{i+1} ({voice}): ✅")
        except Exception as e:
            print(f"    镜头{i+1}: ❌ {e}")
            # 创建静音文件作为后备
            voice_files.append(None)
    
    success_count = sum(1 for v in voice_files if v)
    print(f"  ✅ 配音生成完成: {success_count}/{len(shots)}")
    
    return voice_files


def render_video(ep_num, image_paths, voice_files):
    """4. 渲染合成视频"""
    print("\n🎬 步骤4: 渲染视频...")
    
    ep_dir = f"{OUTPUT_DIR}/EP{ep_num:03d}"
    os.makedirs(ep_dir, exist_ok=True)
    
    output_video = f"{ep_dir}/final.mp4"
    concat_file = f"{ep_dir}/concat.txt"
    
    # 准备合并列表
    with open(concat_file, 'w') as f:
        for i in range(len(image_paths)):
            img = image_paths[i] if image_paths[i] else ""
            voice = voice_files[i] if voice_files[i] else ""
            
            if not img:
                continue
            
            # 创建临时视频片段
            clip_file = f"{ep_dir}/clips/clip_{i+1:02d}.mp4"
            os.makedirs(f"{ep_dir}/clips", exist_ok=True)
            
            # 使用ffmpeg合成 (图片 + 配音)
            duration = 10  # 10秒/镜头
            
            if voice and os.path.exists(voice):
                # 有配音: 图片 + 配音
                cmd = [
                    'ffmpeg', '-y',
                    '-loop', '1', '-i', img,
                    '-i', voice,
                    '-c:v', 'libx264', '-t', str(duration),
                    '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
                    '-c:a', 'aac', '-shortest',
                    '-movflags', '+faststart',
                    clip_file
                ]
            else:
                # 无配音: 只有图片
                cmd = [
                    'ffmpeg', '-y',
                    '-loop', '1', '-i', img,
                    '-c:v', 'libx264', '-t', str(duration),
                    '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
                    '-an',
                    '-movflags', '+faststart',
                    clip_file
                ]
            
            subprocess.run(cmd, capture_output=True)
            
            if os.path.exists(clip_file):
                f.write(f"file '{clip_file}'\n")
    
    # 合并所有片段
    if os.path.exists(concat_file):
        subprocess.run([
            'ffmpeg', '-y',
            '-f', 'concat', '-safe', '0', '-i', concat_file,
            '-c', 'copy',
            '-movflags', '+faststart',
            output_video
        ], capture_output=True)
        
        # 复制到桌面
        desktop_video = f"{DESKTOP_DIR}/EP{ep_num:03d}_final.mp4"
        subprocess.run(['cp', output_video, desktop_video])
        
        print(f"  ✅ 视频生成完成: {output_video}")
        print(f"  📱 已复制到桌面: {desktop_video}")
        
        return output_video
    
    return None


def update_progress(episode_num):
    """更新进度"""
    progress_file = f'{UNIVERSE_DIR}/progress.json'
    
    with open(progress_file, encoding='utf-8') as f:
        progress = json.load(f)
    
    if episode_num not in progress['completed_episodes']:
        progress['completed_episodes'].append(episode_num)
    progress['next_episode'] = episode_num + 1
    progress['last_generated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)
    
    print(f"\n📊 进度已更新: 第{episode_num}集完成，下一集第{progress['next_episode']}集")


def main():
    print("=" * 60)
    print("   AI短剧单集生成器 v2 (阿里云百炼API)")
    print("   时长: 3分钟 (18镜头)")
    print("=" * 60)
    
    # 1. 加载宇宙档案
    print("\n1️⃣ 加载宇宙档案...")
    world, characters, episodes, progress = load_universe()
    load_char_voice_map(characters)
    
    print(f"   项目: {world['universe_name']}")
    print(f"   总集数: {progress['total_episodes']}")
    print(f"   下一集: 第{progress['next_episode']}集\n")
    
    # 2. 获取当前集数
    episode_num = progress['next_episode']
    if episode_num > len(episodes):
        print(f"❌ 所有剧集已生成完毕!")
        return
    
    episode_info = episodes[episode_num - 1]
    print(f"2️⃣ 开始生成第{episode_num}集: {episode_info['title']}\n")
    
    # 3. 初始化API
    api = AliyunAPI()
    
    # 4. 获取上集摘要
    prev_summary = get_prev_summary(progress)
    
    # 5. 生成剧本
    script_data = generate_script(api, episode_info, world, characters, prev_summary)
    script_data['episode'] = episode_num
    
    # 保存剧本JSON
    ep_dir = f"{OUTPUT_DIR}/EP{episode_num:03d}"
    os.makedirs(ep_dir, exist_ok=True)
    with open(f"{ep_dir}/script.json", 'w', encoding='utf-8') as f:
        json.dump(script_data, f, indent=2, ensure_ascii=False)
    
    # 6. 生成图片
    image_paths = generate_images(api, script_data, characters)
    
    # 7. 生成配音
    voice_files = generate_voice(api, script_data, characters)
    
    # 8. 渲染视频
    video_path = render_video(episode_num, image_paths, voice_files)
    
    # 9. 更新进度
    update_progress(episode_num)
    
    print("\n" + "=" * 60)
    print(f"✅ 第{episode_num}集生成完成!")
    print("=" * 60)


if __name__ == '__main__':
    main()
