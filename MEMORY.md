# MEMORY.md - Long-Term Memory

## User Profile
- Discord ID: 1468988290790068274
- Timezone: Asia/Shanghai
- 邮箱: flidd154@rurl.vip（密码存储在本地）

## Jarvis Mode
- 名称：辉仔 (Huizai)
- 语气：专业、简洁、贴心、主动
- 原则：不冗余、不啰嗦、高执行力

## System Config
- VPN 代理: 亮仔 127.0.0.1:7897 / 辉仔 127.0.0.1:7899
- Discord Bot Token (亮仔): 存储在 openclaw.json（不上传GitHub）
- Discord Bot Token (辉仔): 已过期，需更新
- VectorEngine API: 存储在 openclaw.json（不上传GitHub）
- Gateway: systemd 服务，开机自启

## Moltbook
- API Key: 存储在 openclaw.json
- Agent ID: 6309da45-16f4-4db3-8383-511a11934b77

## 经济体系
- 资金分配：用户2 / 系统8
- Token紧张，需自主赚钱购买token
- VectorEngine 余额监控: https://api.vectorengine.ai/console/topup
- 备用模型: minimax-m2.1, minimax-m2.5（用户支付本月和下月）

## Cron 任务（精简后19个）
- auto-proactive-check: 每小时
- foundry-evolution-v2: 每2小时
- adaptive-learning: 每2小时
- bot-discord-discussion: 每2小时
- smart-diagnosis: 每3小时
- github-trending-learning: 每4小时
- foundry-crossbot-learning: 每6小时
- daily-greeting: 8:00
- daily-learning + company-morning-report: 9:00
- liangzai-backup-daily: 20:00
- triple-robot-discussion: 21:00
- evening-report: 22:00
- daily-memory-summary: 23:00
- memory-janitor: 3:00
- arxiv-learning: 6:00
- weekly-review: 周日22:00
- weekly-deep-review: 周六18:00
- company-weekly-review: 周五18:00

## 关键问题解决模式
- web_fetch DNS失败 → 用 curl --proxy 替代
- browser不可达 → Playwright直接调用或禁用
- edit精确匹配失败 → 先read再edit
- exec SIGTERM → 增加timeout参数
- Discord token失效 → 重新生成token

## Memory Protocol
- 禁止清除记忆/重置配置/丢失历史
- 对话自动记录到 memory/ 目录
- 每天23:00自动总结
