#!/usr/bin/env python3
"""
剧本生成Prompt模板
参考抖音爆款AI短剧结构优化
"""

SYSTEM_PROMPT = """你是一个专业短视频剧编剧，擅长创作抖音爆款短剧。

创作原则:
1. 节奏要快，每5-10秒一个爽点/反转
2. 情绪要强烈: 愤怒、感动、爽快感、悬念
3. 对白要口语化，有冲击力
4. 画面感强，适合AI生成

输出格式: 严格的JSON数组
"""


def build_script_prompt(episode_info: dict, universe: dict, characters: list, 
                        prev_summary: str = "") -> str:
    """构建剧本生成Prompt
    
    Args:
        episode_info: 当前集信息 (title, core_conflict, cliffhanger等)
        universe: 世界观设定
        characters: 角色列表
        prev_summary: 上集剧情摘要
    
    Returns:
        完整的prompt字符串
    """
    
    # 角色描述
    char_desc = []
    for c in characters:
        char_desc.append(f"- {c['name']}: {c['personality']}, 外貌: {c['appearance_fixed']['face']}")
    char_text = "\n".join(char_desc)
    
    # 世界观
    world_text = f"""
- 剧名: {universe['universe_name']}
- 时代: {universe['era']}
- 核心冲突: {universe['core_conflict']}
- 场景: {universe['geography']}
- 视觉风格: {universe['visual_style']}
"""
    
    prompt = f"""请生成第{episode_info['episode']}集的完整剧本。

## 上集回顾
{prev_summary if prev_summary else '暂无 (第1集)'}

## 世界观
{world_text}

## 角色
{char_text}

## 本集信息
- 集标题: {episode_info['title']}
- 核心冲突: {episode_info['core_conflict']}
- 主要角色: {', '.join(episode_info.get('main_characters', []))}

## 剧本要求

【格式】严格JSON数组，每个镜头一个元素:
[
  {{
    "shot": 1,
    "duration": "10秒",
    "scene": "场景描述",
    "characters": ["角色名"],
    "visual_prompt": "AI图片生成提示词 (英文, 详细, 适合AI理解)",
    "dialogue": "对白/旁白文字",
    "emotion": "情绪: 紧张/愤怒/感动/爽/悬念",
    "camera": "镜头: 远景/中景/近景/特写",
    "sound": "音效: 背景音乐描述"
  }},
  ...
]

【结构】共18个镜头，总时长3分钟:
- 镜头1-2 (0-20秒): 钩子开场，吸引眼球
- 镜头3-8 (20-80秒): 铺垫+冲突积累  
- 镜头9-15 (80-150秒): 核心爽点爆发
- 镜头16-18 (150-180秒): 悬念结尾，引向下一集

【风格】参考抖音爆款:
- 霸总重生、复仇打脸、甜宠穿越
- 对白简短有力，情绪饱满
- 每集结尾必须留悬念

请直接输出JSON，不要其他文字。"""
    
    return prompt


def build_image_prompt(shot: dict, character_appearance: dict) -> str:
    """构建图片生成Prompt
    
    Args:
        shot: 镜头信息
        character_appearance: 角色外貌描述
    
    Returns:
        英文提示词
    """
    
    # 提取角色外观
    chars = shot.get("characters", [])
    char_str = ", ".join(chars) if chars else ""
    
    # 构建提示词
    prompt = f"{shot.get('scene', '')}, {char_str}"
    
    if shot.get("emotion"):
        prompt += f", {shot['emotion']} expression"
    
    if shot.get("camera"):
        prompt += f", {shot['camera']} shot"
    
    # 添加质量词
    prompt += ", high quality, detailed, realistic, 9:16 vertical video frame"
    
    return prompt


def parse_script_response(response: str) -> list:
    """解析API返回的剧本JSON"""
    import json
    
    # 尝试提取JSON
    try:
        # 去掉可能的markdown标记
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        
        return json.loads(response)
    except json.JSONDecodeError as e:
        print(f"JSON解析失败: {e}")
        print(f"原始响应: {response[:500]}")
        return []


def extract_dialogue_for_tts(shots: list) -> list:
    """从剧本中提取需要配音的文字
    
    Returns:
        [{"text": str, "voice": str, "character": str}]
    """
    results = []
    
    for shot in shots:
        dialogue = shot.get("dialogue", "").strip()
        if not dialogue:
            continue
        
        # 简化处理：取第一个角色名作为音色参考
        chars = shot.get("characters", [])
        character = chars[0] if chars else "narrator"
        
        # TODO: 根据character查表确定voice
        results.append({
            "text": dialogue,
            "character": character,
            "shot": shot.get("shot")
        })
    
    return results


if __name__ == "__main__":
    # 测试
    episode = {
        "episode": 3,
        "title": "第3集: 回到大学",
        "core_conflict": "重回大学时代",
        "main_characters": ["顾阳", "白心心"]
    }
    
    universe = {
        "universe_name": "霸总的重生",
        "era": "现代",
        "core_conflict": "富二代被退婚，重生后逆袭成首富",
        "geography": "魔都上海、校园",
        "visual_style": "现代都市"
    }
    
    characters = [
        {"name": "顾阳", "gender": "男", "personality": "表面玩世不恭", 
         "appearance_fixed": {"face": "剑眉星目"}},
        {"name": "白心心", "gender": "女", "personality": "活泼开朗",
         "appearance_fixed": {"face": "鹅蛋脸"}}
    ]
    
    prompt = build_script_prompt(episode, universe, characters)
    print(prompt[:500])
