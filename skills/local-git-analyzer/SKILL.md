# local-git-analyzer

本地Git仓库分析技能，无需任何外部API。

## 功能

- **状态分析**: 当前分支、暂存/未暂存/未跟踪文件
- **提交历史**: 带缓存的高效日志查询
- **差异比较**: 文件差异、暂存差异
- **责备分析**: 文件行级作者追踪
- **贡献统计**: 贡献者统计
- **活动追踪**: 最近N天的活动汇总
- **分支管理**: 分支列表和远程追踪
- **标签管理**: 标签列表
- **搜索**: 提交消息搜索
- **统计**: 仓库概览统计

## 使用

```javascript
const { GitAnalyzer } = require('local-git-analyzer');

const git = new GitAnalyzer('/path/to/repo');

// 获取状态
const status = await git.status();

// 获取日志
const logs = await git.log({ limit: 20 });

// 获取贡献者
const contributors = await git.contributors();

// 搜索提交
const results = await git.search('fix bug', { author: 'john' });

// 仓库统计
const stats = await git.stats();
```

## 配置

无需配置，纯本地运行。

## 缓存

- 默认缓存TTL: 5分钟
- 自动清理过期缓存
