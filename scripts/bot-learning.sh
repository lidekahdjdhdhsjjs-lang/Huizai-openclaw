#!/bin/bash
# Bot互联学习脚本

echo "=== 亮仔 ↔ 辉仔 互联学习 ==="
echo ""

# 1. 检查SSH连接
echo "1️⃣ 检查SSH连接..."
ssh -o ConnectTimeout=5 li@192.168.1.16 "echo 辉仔在线" 2>/dev/null && echo "   ✅ 互联正常"

# 2. 对比技能
echo ""
echo "2️⃣ 技能对比..."
LIANG_SKILLS=$(ls ~/.openclaw/workspace/skills/ 2>/dev/null | wc -l)
HUI_SKILLS=$(ssh li@192.168.1.16 "ls ~/.openclaw/workspace/skills/ 2>/dev/null | wc -l")
echo "   亮仔: $LIANG_SKILLS 个技能"
echo "   辉仔: $HUI_SKILLS 个技能"

# 3. 找出独有技能
echo ""
echo "3️⃣ 技能差异..."
echo "   辉仔有亮仔没有的:"
ssh li@192.168.1.16 "ls ~/.openclaw/workspace/skills/" 2>/dev/null | while read s; do
  if [ ! -d ~/.openclaw/workspace/skills/$s ]; then
    echo "   - $s"
  fi
done

# 4. 复制辉仔的独家技能
echo ""
echo "4️⃣ 学习中..."
for skill in $(ssh li@192.168.1.16 "ls ~/.openclaw/workspace/skills/" 2>/dev/null); do
  if [ ! -d ~/.openclaw/workspace/skills/$skill ]; then
    echo "   + 获取: $skill"
    scp -r li@192.168.1.16:~/.openclaw/workspace/skills/$skill ~/.openclaw/workspace/skills/ 2>/dev/null
  fi
done

echo ""
echo "✅ 学习完成！"
