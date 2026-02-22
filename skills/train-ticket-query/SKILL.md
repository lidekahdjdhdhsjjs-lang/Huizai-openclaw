---
name: train-ticket-query
description: 查询高铁余票及价格
---

# train-ticket-query

查询高铁余票及价格

## Tools

### query_train

查询指定日期和路线的火车票

**Parameters:**
- `date` (required): 日期，格式 YYYY-MM-DD，例如 2026-02-20
- `from` (required): 出发城市，例如 深圳、广州、北京
- `to` (required): 目的城市，例如 深圳、广州、上海

**实现方式：**

由于12306官网需要登录，采用以下方案：

1. **首选**: 使用curl调用12306开放API
```bash
curl -s "https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=DATE&leftTicketDTO.from_station_name=FROM&leftTicketDTO.to_station_name=TO&purpose_codes=ADULT"
```

2. **备选**: 使用exec+curl抓取第三方票务API
```bash
curl -s "https://p.qqan.com/api/train/FROM-TO/DATE"
```

3. **最终备选**: 提示用户手动查询
> "抱歉，12306接口暂时无法访问。建议：\n1. 打开12306 APP或官网\n2. 输入 深圳→广州，日期 2月20日\n3. 查看余票情况"

**返回格式：**
```
🚄 深圳 → 广州 | 2月20日

车次    时间        座位/价格
G1234  08:00-10:30  ¥XXX
D5678  14:00-16:30  ¥XXX
```

