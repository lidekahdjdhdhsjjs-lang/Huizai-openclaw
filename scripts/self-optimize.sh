#!/bin/bash
# 自我重构脚本 - 分析系统并尝试自动优化配置

CONFIG_FILE="$HOME/.openclaw/openclaw.json"
BACKUP_FILE="$HOME/.openclaw/openclaw.json.bak.auto"
LOG_FILE="$HOME/.openclaw/workspace/memory/self-optimize.log"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "=== 开始自我重构分析 ==="

# 1. 分析当前配置
log "分析配置文件..."
python3 << 'PYEOF'
import json
import os

config_path = os.path.expanduser("$CONFIG_FILE")
with open(config_path) as f:
    config = json.load(f)

optimizations = []

# 检查模型配置
model = config.get("agents", {}).get("defaults", {}).get("model", {}).get("primary", "")
if "minimax" in model.lower():
    optimizations.append("当前使用 minimax，可能不是最优选择")

# 检查并发配置
max_concurrent = config.get("agents", {}).get("defaults", {}).get("maxConcurrent", 4)
if max_concurrent > 8:
    optimizations.append(f"并发数 {max_concurrent} 可能过高")

# 检查内存设置
compaction = config.get("agents", {}).get("defaults", {}).get("compaction", {})
mode = compaction.get("mode", "default")
if mode == "default":
    optimizations.append("compaction 模式可设为 'safeguard' 更安全")

# 检查 hooks
hooks = config.get("hooks", {}).get("internal", {}).get("entries", {})
enabled_hooks = [k for k, v in hooks.items() if v.get("enabled", False)]
if len(enabled_hooks) < 3:
    optimizations.append(f"只启用了 {len(enabled_hooks)} 个 hooks，可增加")

print("=== 优化建议 ===")
for i, opt in enumerate(optimizations, 1):
    print(f"{i}. {opt}")

if not optimizations:
    print("✅ 配置已经是最优状态")
PYEOF

# 2. 自动应用安全优化
log "应用安全优化..."
cp "$CONFIG_FILE" "$BACKUP_FILE"

python3 << 'PYEOF'
import json

config_path = os.path.expanduser("$CONFIG_FILE")
with open(config_path) as f:
    config = json.load(f)

# 自动优化
changed = []

# 1. 启用更多 hooks
if "hooks" not in config:
    config["hooks"] = {"internal": {"enabled": True, "entries": {}}}
if "internal" not in config["hooks"]:
    config["hooks"]["internal"] = {"enabled": True, "entries": {}}
if "entries" not in config["hooks"]["internal"]:
    config["hooks"]["internal"]["entries"] = {}

# 确保关键 hooks 启用
for hook in ["exec-exit-code-check", "browser-service-check", "message-auto-target"]:
    if hook not in config["hooks"]["internal"]["entries"]:
        config["hooks"]["internal"]["entries"][hook] = {"enabled": True}
        changed.append(f"启用 {hook}")

# 2. 优化 compaction
if "agents" not in config:
    config["agents"] = {}
if "defaults" not in config["agents"]:
    config["agents"]["defaults"] = {}
compaction = config["agents"]["defaults"].get("compaction", {})
if compaction.get("mode") == "default":
    config["agents"]["defaults"]["compaction"] = {"mode": "safeguard", "memoryFlush": {"enabled": True}}
    changed.append("compaction mode -> safeguard")

if changed:
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print("已自动优化:")
    for c in changed:
        print(f"  + {c}")
else:
    print("无需优化")
PYEOF

log "=== 自我重构完成 ==="
