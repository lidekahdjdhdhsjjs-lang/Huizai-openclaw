# Tool Guard - 执行约束与风险控制

## 描述
在每个工具调用前进行风险评估和约束检查，自动检测高风险操作并提供安全建议。

## 功能
1. **高风险操作检测**: gateway/exec/message 的危险操作
2. **超时配置建议**: 自动建议合理的超时值
3. **自动降级方案**: web_fetch失败时自动切换到web_search

## 风险规则
- gateway: restart, config.apply, update.run
- exec: rm -rf, dd, mkfs, chmod 777, kill -9
- message: broadcast, send

## 超时配置
- browser: 30000ms
- exec: 60000ms  
- web_fetch: 15000ms
