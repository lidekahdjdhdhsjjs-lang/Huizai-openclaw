#!/bin/bash
# 技能自动优化脚本 - 分析低效技能并生成优化建议

SKILLS_DIR="$HOME/.openclaw/workspace/skills"
LOG_FILE="$HOME/.openclaw/workspace/memory/skill-optimization.json"

python3 << 'PYEOF'
import json
import os
from datetime import datetime

# 读取 Foundry 指标
import subprocess
result = subprocess.run(
    ["python3", "-c", "import json; print(json.dumps(__import__('json').load(open(os.path.expanduser('~/.openclaw/workspace/memory/hourly.md'))))"],
    capture_output=True, text=True
)

# 分析每个技能
skills_data = []
skills_dir = os.path.expanduser("$SKILLS_DIR")

for skill in os.listdir(skills_dir):
    skill_path = os.path.join(skills_dir, skill)
    if not os.path.isdir(skill_path):
        continue
    
    # 检查技能文件
    has_skill = os.path.exists(os.path.join(skill_path, "SKILL.md"))
    size = sum(os.path.getsize(os.path.join(root, f)) 
               for root, dirs, files in os.walk(skill_path) 
               for f in files) // 1024
    
    # 简单评分
    score = 100
    issues = []
    
    if not has_skill:
        score -= 50
        issues.append("缺少SKILL.md")
    
    if size > 100:
        score -= 10
        issues.append(f"体积较大({size}KB)")
    
    # 检查重复
    if skill in ["context-engineering", "openclaw-context-optimizer"]:
        score -= 30
        issues.append("功能重复")
    
    skills_data.append({
        "name": skill,
        "score": max(0, score),
        "size_kb": size,
        "issues": issues,
        "status": "ok" if score >= 80 else "need_optimize" if score >= 50 else "to_remove"
    })

# 按评分排序
skills_data.sort(key=lambda x: x["score"])

# 生成优化建议
optimizations = []
for s in skills_data:
    if s["status"] == "to_remove":
        optimizations.append(f"删除: {s['name']} ({', '.join(s['issues'])})")
    elif s["status"] == "need_optimize":
        optimizations.append(f"优化: {s['name']} ({', '.join(s['issues'])})")

# 保存结果
result = {
    "timestamp": datetime.now().isoformat(),
    "total_skills": len(skills_data),
    "ok_count": sum(1 for s in skills_data if s["status"] == "ok"),
    "need_optimize_count": sum(1 for s in skills_data if s["status"] == "need_optimize"),
    "to_remove_count": sum(1 for s in skills_data if s["status"] == "to_remove"),
    "optimizations": optimizations[:10]
}

with open(os.path.expanduser("$LOG_FILE"), "w") as f:
    json.dump(result, f, indent=2)

print(f"=== 技能优化分析 ===")
print(f"总技能: {result['total_skills']}")
print(f"正常: {result['ok_count']} | 需优化: {result['need_optimize_count']} | 需删除: {result['to_remove_count']}")
print("\n优化建议:")
for o in optimizations[:5]:
    print(f"  - {o}")
PYEOF
