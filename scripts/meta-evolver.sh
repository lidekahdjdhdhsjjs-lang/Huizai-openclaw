#!/bin/bash
# Meta-Evolver: Foundry + Capability Evolver 融合
# 方案1: Foundry提供洞察 → Evolver执行修复

LOG_FILE="$HOME/.openclaw/workspace/memory/meta-evolution.log"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "=== Meta-Evolution 开始 ==="

# 1. 运行 Foundry 学习
log "1. 运行 Foundry 分析..."
python3 << 'PYEOF'
import subprocess
import json
import os

# 获取 Foundry insights
result = subprocess.run(
    ["python3", "-c", """
import sys
sys.path.insert(0, os.path.expanduser('~/.openclaw/extensions/foundry'))
from foundry_learnings import foundry_learnings
learnings = foundry_learnings()
print(json.dumps(learnings))
"""],
    capture_output=True, text=True, timeout=30
)

# 简化：直接读取洞察文件
memory_dir = os.path.expanduser("~/.openclaw/workspace/memory")
files = [f for f in os.listdir(memory_dir) if f.endswith('.md') and 'learn' in f.lower()]
print(f"Found {len(files)} learning files")

# 提取关键问题
issues = []
for f in files[:5]:
    path = os.path.join(memory_dir, f)
    with open(path) as fp:
        content = fp.read()
        if 'error' in content.lower() or 'fail' in content.lower():
            issues.append(f)

print(f"Issues: {issues}")
PYEOF

# 2. 准备 Evolver 输入
log "2. 准备 Evolver 输入..."
cd ~/.openclaw/workspace/skills/capability-evolver

# 3. 运行 Evolver (维修模式)
log "3. 运行 Capability Evolver..."
export EVOLVE_STRATEGY=repair-only
export EVOLVE_LOAD_MAX=5.0

timeout 60 node index.js run 2>&1 | tail -20

log "=== Meta-Evolution 完成 ==="
