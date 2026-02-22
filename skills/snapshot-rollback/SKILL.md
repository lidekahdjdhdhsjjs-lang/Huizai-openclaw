---
name: snapshot-rollback
description: 配置快照与自动回滚系统
---

# snapshot-rollback

配置快照与回滚系统

## 功能

1. **定时检查** - 每30分钟检查Gateway运行状态
2. **快照保存** - 修改文件前自动创建快照
3. **自动回滚** - 异常时恢复到上一个正确状态
4. **清理机制** - 正常运行后删除旧快照

## 实现

### 1. 快照保存
```bash
# 创建快照
SNAPSHOT_DIR=~/.openclaw/snapshots
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
tar -czf $SNAPSHOT_DIR/snapshot-$TIMESTAMP.tar.gz ~/.openclaw/openclaw.json ~/.openclaw/workspace/
```

### 2. 监控检查
```bash
# 检查Gateway状态
openclaw gateway status | grep -q "running" && echo "OK" || echo "FAIL"
```

### 3. 回滚流程
```
检测失败 → 恢复上一个快照 → 重启Gateway → 报告错误
```

### 4. 清理
```
正常运行 → 删除上上个快照 → 保留最新
```

## Cron配置

- 检查间隔: 30分钟
- 快照保留: 最近2个

## 告警与恢复

- 回滚成功后重启Gateway
- 恢复所有定时任务
- 清理旧快照
- 记录操作日志

