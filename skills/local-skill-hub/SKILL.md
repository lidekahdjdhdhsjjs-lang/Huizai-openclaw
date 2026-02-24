# local-skill-hub

本地技能管理中心，无需任何外部API。

## 功能

- **技能列表**: 列出所有已安装技能
- **技能搜索**: 按名称/描述/关键词搜索
- **技能详情**: 获取技能详细信息
- **技能验证**: 检查技能完整性
- **启用/禁用**: 管理技能状态
- **索引刷新**: 重新构建技能索引
- **统计汇总**: 技能总体统计

## 使用

```javascript
const { SkillHub } = require('local-skill-hub');

const hub = new SkillHub();

// 列出所有技能
const skills = hub.list();

// 搜索技能
const results = hub.search('git');

// 获取技能详情
const skill = hub.get('local-git-analyzer');

// 验证技能
const validation = hub.validate('local-git-analyzer');

// 刷新索引
hub.refresh();

// 统计汇总
const summary = hub.summary();
```

## 配置

无需配置，自动扫描 `~/.openclaw/workspace/skills/` 目录。
