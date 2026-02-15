---
name: qveris
description: 通过 QVeris API 搜索和执行动态工具。用于天气、搜索、数据检索、股票交易分析等。 Requires QVERIS_API_KEY environment variable.
triggers:
  - pattern: "股票|stock|股价|股市"
  - pattern: "天气|weather"
  - pattern: "搜索|search"
  - pattern: "数据|data"
auto_invoke: true
metadata:
  openclaw:
    requires:
      env:
        - QVERIS_API_KEY
---

# QVeris 动态工具搜索与执行

QVeris 提供动态工具发现和执行能力 - 按功能搜索工具，然后用参数执行。

## 环境变量

需要设置:
- `QVERIS_API_KEY` - 从 https://qveris.ai 获取

已在 OpenClaw 配置中设置。

## 使用方式

### 搜索工具
```bash
qveris-cli search "weather forecast"
```

### 执行工具
```bash
qveris-cli execute <tool_id> --search-id <id> --params '{"city": "London"}'
```

## 功能示例

- **天气数据**: 获取全球任意位置当前天气和预报
- **股票市场**: 查询股价、历史数据、财报日历
- **搜索**: 网页搜索、新闻检索
- **数据 API**: 货币汇率、地理位置、翻译等
- **加密货币**: 比特币、以太坊等实时价格

## 示例

```bash
# 搜索天气工具
qveris-cli search "current weather data"

# 搜索股票工具  
qveris-cli search "stock price"

# 搜索加密货币
qveris-cli search "bitcoin price"
```

## 已安装 CLI

- 位置: `~/.local/bin/qveris-cli`
- 使用 curl + 代理，无需额外依赖
