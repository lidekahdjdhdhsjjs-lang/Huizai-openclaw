#!/usr/bin/env python3
"""
阿里云百炼API封装
支持: 文本生成、图像生成、TTS语音合成
"""

import os
import json
import time
import asyncio
import aiohttp
import subprocess
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor

# API配置
DASHSCOPE_API_KEY = "sk-3097bee544844d5399e57906bf9f961b"
BASE_URL = "https://dashscope.aliyuncs.com/api/v1"

# 模型配置
MODELS = {
    "text": "qwen-max",
    "image": "wan2.6-t2i", 
    "tts": "cosyvoice-v3-plus"
}

# TTS音色映射
TTS_VOICES = {
    "male": ["xiaogang", "yitian", "longwan"],
    "female": ["xiaoyun", "xiaoxuan", "lingxu"],
    "default": "xiaoyun"
}


class AliyunAPI:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or DASHSCOPE_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def generate_text(self, prompt: str, system_prompt: str = None) -> str:
        """文本生成 (通义千问)"""
        url = f"{BASE_URL}/services/aigc/text-generation/generation"
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": MODELS["text"],
            "input": {"messages": messages},
            "parameters": {
                "result_format": "message",
                "temperature": 0.7
            }
        }
        
        response = self._request(url, payload)
        return response["output"]["choices"]["message"]["content"]
    
    def generate_image(self, prompt: str, size: str = "720*1280") -> str:
        """单张图片生成 (万相) - 异步"""
        url = f"{BASE_URL}/services/aigc/image-generation/generation"
        
        payload = {
            "model": MODELS["image"],
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"text": prompt}
                        ]
                    }
                ]
            },
            "parameters": {
                "size": size,
                "n": 1,
                "prompt_extend": True
            }
        }
        
        # 提交任务
        task_id = self._submit_task(url, payload)
        
        # 轮询结果
        return self._wait_for_task(task_id)
    
    def generate_images_parallel(self, prompts: List[str], size: str = "720*1280", 
                                  batch_size: int = 6) -> List[str]:
        """并行生成多张图片 (分批避免QPS限制)"""
        results = []
        
        # 分批处理
        for i in range(0, len(prompts), batch_size):
            batch = prompts[i:i+batch_size]
            print(f"  📸 生成图片批次 {i//batch_size + 1}/{(len(prompts)-1)//batch_size + 1} ({len(batch)}张)")
            
            # 本批次内并行
            batch_results = []
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(self.generate_image, p, size) for p in batch]
                for future in futures:
                    try:
                        result = future.result()
                        batch_results.append(result)
                    except Exception as e:
                        print(f"  ⚠️ 图片生成失败: {e}")
                        batch_results.append(None)
            
            results.extend(batch_results)
            
            # 批次间隔，避免限流
            if i + batch_size < len(prompts):
                time.sleep(2)
        
        return results
    
    def generate_tts(self, text: str, voice: str = "xiaoyun", output_path: str = None) -> str:
        """TTS语音合成 - 使用gTTS作为后备"""
        try:
            url = f"{BASE_URL}/services/aigc/speech-generation/t2a"
            
            payload = {
                "model": MODELS["tts"],
                "input": {
                    "text": text,
                    "voice": voice
                },
                "parameters": {
                    "format": "mp3",
                    "rate": 24000
                }
            }
            
            response = self._request(url, payload)
        except Exception as e:
            print(f"  ⚠️ 阿里云TTS失败，使用gTTS后备: {e}")
            return self._generate_tts_gtts(text, output_path)
        
        # 保存音频
        if output_path is None:
            output_path = f"/tmp/tts_{int(time.time())}.mp3"
        
        audio_data = response["output"]["audio"]
        import base64
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(audio_data))
        
        return output_path
    
    def _generate_tts_gtts(self, text: str, output_path: str = None) -> str:
        """使用gTTS生成配音"""
        try:
            from gtts import gTTS
        except ImportError:
            # 创建空音频文件作为后备
            if output_path is None:
                output_path = f"/tmp/tts_{int(time.time())}.mp3"
            # 创建静音音频
            subprocess.run([
                'ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono',
                '-t', '3', '-q:a', '9', '-acodec', 'libmp3lame', output_path
            ], capture_output=True)
            return output_path
        
        if output_path is None:
            output_path = f"/tmp/tts_{int(time.time())}.mp3"
        
        # 限制文本长度
        text = text[:500] if len(text) > 500 else text
        
        try:
            tts = gTTS(text=text, lang='zh-cn')
            tts.save(output_path)
        except Exception as e:
            print(f"  ⚠️ gTTS失败: {e}")
            # 创建静音
            subprocess.run([
                'ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono',
                '-t', '3', '-q:a', '9', '-acodec', 'libmp3lame', output_path
            ], capture_output=True)
        
        return output_path
        
        # 保存音频
        if output_path is None:
            output_path = f"/tmp/tts_{int(time.time())}.mp3"
        
        audio_data = response["output"]["audio"]
        import base64
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(audio_data))
        
        return output_path
    
    def generate_tts_batch(self, texts: List[Dict], output_dir: str) -> List[str]:
        """批量TTS生成 (按角色分)"""
        os.makedirs(output_dir, exist_ok=True)
        results = []
        
        for i, item in enumerate(texts):
            text = item["text"]
            voice = item.get("voice", "xiaoyun")
            
            output_path = f"{output_dir}/voice_{i:02d}_{voice}.mp3"
            try:
                path = self.generate_tts(text, voice, output_path)
                results.append(path)
            except Exception as e:
                print(f"  ⚠️ TTS生成失败: {e}")
                results.append(None)
        
        return results
    
    def _request(self, url: str, payload: dict, retries: int = 3) -> dict:
        """发送HTTP请求 (带重试)"""
        import requests
        for attempt in range(retries):
            try:
                response = requests.post(url, headers=self.headers, json=payload, timeout=180)
                
                if response.status_code != 200:
                    raise Exception(f"API请求失败: {response.text}")
                
                result = response.json()
                
                if "output" not in result:
                    raise Exception(f"API返回异常: {result}")
                
                return result
            except Exception as e:
                if attempt < retries - 1:
                    print(f"  ⚠️ 请求失败，{attempt+1}/{retries}次重试...")
                    time.sleep(3)
                else:
                    raise e
    
    def _submit_task(self, url: str, payload: dict) -> str:
        """提交异步任务"""
        import requests
        headers = self.headers.copy()
        headers["X-DashScope-Async"] = "enable"
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            raise Exception(f"任务提交失败: {response.text}")
        
        result = response.json()
        return result["output"]["task_id"]
    
    def _wait_for_task(self, task_id: str, timeout: int = 180) -> str:
        """等待异步任务完成"""
        url = f"{BASE_URL}/tasks/{task_id}"
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            import requests
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"任务查询失败: {response.text}")
            
            result = response.json()
            status = result["output"]["task_status"]
            
            if status == "SUCCEEDED":
                # 获取图片URL
                return result["output"]["results"][0]["url"]
            elif status == "FAILED":
                raise Exception(f"任务失败: {result}")
            else:
                time.sleep(2)
        
        raise Exception("任务超时")


def get_voice_for_gender(gender: str) -> str:
    """根据性别获取TTS音色"""
    gender = gender.lower()
    if gender in ["男", "male", "m"]:
        import random
        return random.choice(TTS_VOICES["male"])
    elif gender in ["女", "female", "f"]:
        import random
        return random.choice(TTS_VOICES["female"])
    else:
        return TTS_VOICES["default"]


if __name__ == "__main__":
    api = AliyunAPI()
    
    # 测试文本生成
    print("=== 测试文本生成 ===")
    result = api.generate_text("用一句话介绍《霸总的重生》这部剧")
    print(result[:200])
