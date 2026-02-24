# Realtime Search Learning

实时搜索学习技能 - 从多种来源获取最新知识并自动学习。

## 功能

- 🌐 **多源搜索**: Brave Search、GitHub、arXiv、HackerNews
- 📚 **自动学习**: 发现新模式并结晶为知识
- 🔄 **定期更新**: 可配置的定时学习任务
- 🎯 **智能过滤**: 只学习高质量内容
- 📊 **学习报告**: 生成学习进度报告

## 配置

在 `~/.openclaw/openclaw.json` 中添加:

```json
{
  "skills": {
    "realtime-search-learning": {
      "enabled": true,
      "sources": {
        "brave": {
          "enabled": true,
          "apiKey": "${BRAVE_API_KEY}"
        },
        "github": {
          "enabled": true,
          "token": "${GITHUB_TOKEN}"
        },
        "arxiv": {
          "enabled": true
        },
        "hackernews": {
          "enabled": true
        }
      },
      "schedule": "0 */2 * * *",
      "maxResults": 10,
      "minQuality": 0.7
    }
  }
}
```

## 使用

```
/realtime-search <query>     - 执行实时搜索
/realtime-learn              - 运行学习周期
/realtime-report             - 生成学习报告
```

## 来源

1. **Brave Search** - 实时网络搜索
2. **GitHub** - 代码和项目趋势
3. **arXiv** - 学术论文
4. **HackerNews** - 技术热点
5. **Moltbook** - 社区技能

## 学习流程

```
搜索 → 提取 → 分析 → 评分 → 学习 → 结晶
```

---

*版本: 1.0.0*
*作者: OpenClaw System*
