#!/bin/bash
# 技能自动生成器 - 根据需求生成新技能
# 输入: 技能名称 功能描述

SKILL_NAME="${1:-}"
DESCRIPTION="${2:-}"
SKILLS_DIR="$HOME/.openclaw/workspace/skills"

if [ -z "$SKILL_NAME" ]; then
    echo "用法: $0 <技能名称> <功能描述>"
    echo "示例: $0 twitter-poster 自动发推特"
    exit 1
fi

# 转换名称为 kebab-case
SLUG=$(echo "$SKILL_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# 创建技能目录
SKILL_DIR="$SKILLS_DIR/$SLUG"
mkdir -p "$SKILL_DIR"

# 生成 SKILL.md
cat > "$SKILL_DIR/SKILL.md" << EOF
---
name: $SLUG
description: $DESCRIPTION
---

# $SKILL_NAME

$DESCRIPTION

## 使用方法

\`\`\`bash
# 使用技能
使用 $SLUG 技能
\`\`\`

## 功能列表

- [ ] 功能1
- [ ] 功能2

## 示例

\`\`\`bash
示例命令
\`\`\`
EOF

# 生成 _meta.json
cat > "$SKILL_DIR/_meta.json" << EOF
{
  "name": "$SLUG",
  "displayName": "$SKILL_NAME",
  "description": "$DESCRIPTION",
  "author": {
    "name": "lidekahdjdhdhsjjs-lang"
  },
  "tags": ["auto-generated", "utility"]
}
EOF

echo "✅ 技能已生成: $SLUG"
echo "📁 位置: $SKILL_DIR"
echo ""
echo "下一步: 编辑 SKILL.md 添加实际功能代码"
