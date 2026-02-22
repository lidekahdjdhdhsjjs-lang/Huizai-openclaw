#!/bin/bash
# 代码优化器 - 分析并优化现有代码
# 功能: 检查重复、分析复杂度、给出优化建议

TARGET_DIR="${1:-$HOME/.openclaw/workspace/skills}"
LOG_FILE="$HOME/.openclaw/workspace/memory/code-optimization.json"

echo "=== 代码优化分析 ==="

python3 << 'PYEOF'
import json
import os
import re
from datetime import datetime

target_dir = os.path.expanduser("$TARGET_DIR")
results = {
    "timestamp": datetime.now().isoformat(),
    "issues": [],
    "optimizations": [],
    "stats": {}
}

# 1. 检测重复代码
print("\n1. 检测重复代码...")
duplicates = []
file_hashes = {}

for root, dirs, files in os.walk(target_dir):
    for f in files:
        if f.endswith(('.py', '.js', '.sh')):
            path = os.path.join(root, f)
            try:
                with open(path) as fp:
                    content = fp.read()
                    # 简单哈希
                    h = hash(content[:500])
                    if h in file_hashes:
                        duplicates.append({
                            "file": path,
                            "duplicate_of": file_hashes[h]
                        })
                    else:
                        file_hashes[h] = path
            except:
                pass

results["issues"].extend([{"type": "duplicate", "details": d} for d in duplicates])
print(f"   发现 {len(duplicates)} 个重复文件")

# 2. 检测过长函数
print("\n2. 检测过长代码块...")
long_functions = []
for root, dirs, files in os.walk(target_dir):
    for f in files:
        if f.endswith(('.py', '.js')):
            path = os.path.join(root, f)
            try:
                with open(path) as fp:
                    lines = fp.readlines()
                    if len(lines) > 500:
                        long_functions.append({
                            "file": path,
                            "lines": len(lines)
                        })
            except:
                pass

results["issues"].extend([{"type": "long_file", "details": d} for d in long_functions])
print(f"   发现 {len(long_functions)} 个过长文件")

# 3. 统计各语言占比
print("\n3. 代码统计...")
stats = {".py": 0, ".js": 0, ".sh": 0, ".md": 0}
total_lines = 0

for root, dirs, files in os.walk(target_dir):
    for f in files:
        ext = os.path.splitext(f)[1]
        if ext in stats:
            path = os.path.join(root, f)
            try:
                with open(path) as fp:
                    lines = len(fp.readlines())
                    stats[ext] += lines
                    total_lines += lines
            except:
                pass

results["stats"] = stats
print(f"   Python: {stats['.py']} 行")
print(f"   JS: {stats['.js']} 行")
print(f"   Shell: {stats['.sh']} 行")
print(f"   总计: {total_lines} 行")

# 4. 生成优化建议
print("\n4. 优化建议...")

if len(duplicates) > 0:
    results["optimizations"].append("删除重复文件，整合功能")

if len(long_functions) > 0:
    results["optimizations"].append(f"拆分 {len(long_functions)} 个过长文件")

if stats['.sh'] > 5000:
    results["optimizations"].append("Shell 脚本较多，考虑用 Python 重写")

# 保存结果
with open(os.path.expanduser("$LOG_FILE"), "w") as f:
    json.dump(results, f, indent=2)

print("\n=== 分析完成 ===")
print(f"问题数: {len(results['issues'])}")
print(f"优化建议: {len(results['optimizations'])}")
for opt in results["optimizations"]:
    print(f"  - {opt}")
PYEOF
