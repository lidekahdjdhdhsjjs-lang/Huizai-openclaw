---
name: finance-agent
description: 多智能体金融分析助手 - 模仿 ValueCell 架构的多 Agent 金融分析系统。支持股票查询、加密货币、市场分析、研究报告生成等功能。
triggers:
  - pattern: "股票|stock|股价|股市|A股|港股|美股"
    description: "检测股票相关查询"
  - pattern: "比特币|btc|以太坊|eth|加密货币|crypto|币"
    description: "检测加密货币查询"
  - pattern: "分析|研究|报告|调研"
    description: "检测分析研究请求"
  - pattern: "市场|行情|走势|趋势"
    description: "检测市场查询"
auto_invoke: true
metadata:
  openclaw:
    requires:
      env:
        - QVERIS_API_KEY
    emoji: 💰
---

# Finance Agent - 多智能体金融分析

模仿 ValueCell (⭐9131) 架构的多智能体金融分析系统。

## 架构设计

### 多智能体系统

```
┌─────────────────────────────────────────────┐
│           Finance Agent Manager             │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐        │
│  │ Research    │  │ News        │        │
│  │ Agent       │  │ Agent       │        │
│  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐        │
│  │ Crypto      │  │ Market      │        │
│  │ Agent       │  │ Agent       │        │
│  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────┘
```

### 智能体职责

1. **Research Agent** - 研究代理
   - 公司基本面分析
   - 财务报表解读
   - 估值模型

2. **News Agent** - 新闻代理
   - 实时新闻抓取
   - 舆情分析
   - 事件影响评估

3. **Crypto Agent** - 加密货币代理
   - 加密货币价格查询
   - 趋势分析
   - 市值统计

4. **Market Agent** - 市场代理
   - 大盘走势分析
   - 板块轮动
   - 资金流向

## 使用方式

### 基础查询

```bash
# 股票价格查询
finance query stock "苹果" or "AAPL"

# 加密货币查询
finance query crypto "比特币" or "BTC"

# 市场概况
finance query market

# 新闻查询
finance query news "特斯拉"
```

### 分析功能

```bash
# 公司分析
finance analyze "特斯拉" or "TSLA"

# 行业研究
finance research "新能源汽车"

# 综合报告
finance report "英伟达"
```

### 智能体协作

```bash
# 多智能体分析 (模仿 ValueCell)
finance multi "苹果公司投资价值"
```

## 实现原理

### QVeris 工具集成

使用 QVeris API 调用各种金融数据工具：

```python
# 搜索工具
search_id = qveris.search("stock price API")

# 执行工具
result = qveris.execute(tool_id, search_id, params)
```

### 数据源

- CoinMarketCap - 加密货币数据
- Alpha Vantage - 股票数据
- Yahoo Finance - 市场数据
- News API - 新闻数据

## 配置

需要设置环境变量：
- `QVERIS_API_KEY` - QVeris API 密钥

已在 OpenClaw 配置中设置。

## 示例输出

### 股票查询
```
📈 苹果公司 (AAPL)
- 当前价格: $178.50
- 涨跌: +2.35 (+1.34%)
- 成交量: 52.3M
- 市值: 2.78T
```

### 加密货币
```
₿ 比特币 (BTC)
- 价格: $43,250.00
- 24h涨跌: +3.2%
- 市值: 848B
- 流通量: 19.65M
```

### 综合分析
```
📊 苹果公司分析报告

【基本面】
- 市盈率: 28.5
- 市值: 2.78T
- 营收增长: +8%

【技术面】
- 均线多头排列
- RSI: 65 (中性偏强)
- 支撑位: $170

【新闻舆情】
- 近期新品发布预期
- 分析师普遍看好

【投资建议】
- 建议: 持有
- 风险等级: 中
```

## 扩展计划

- [ ] 添加技术分析指标
- [ ] 实现网格交易策略
- [ ] 添加风险管理系统
- [ ] 支持期权/期货数据

## 参考

- ValueCell: https://github.com/ValueCell-AI/valuecell
- QVeris API: https://qveris.ai
