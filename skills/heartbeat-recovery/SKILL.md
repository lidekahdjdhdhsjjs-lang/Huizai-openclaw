# heartbeat-recovery - 辉仔心跳自我修复技能

## 问题背景
- 辉仔有时会卡死（heartbeat 无响应）
- 需要外部监控发现并恢复
- 需要防止重复工作和状态丢失

## 核心功能

### 1. 心跳状态文件
```bash
# 每次任务开始/进度更新时写入
echo '{"last_heartbeat": '$(date +%s)', "status": "working", "task": "当前任务描述"}' > ~/.openclaw/state/heartbeat.json
```

### 2. 渐进式超时检测
```
第1次检查: 5分钟   - 快速崩溃
第2次检查: 15分钟  - 启动失败
第3次检查: 1小时   - 任务中失败
第4次检查: 4小时   - 长时间任务
```

### 3. 进度标记系统
```json
{
  "task_id": "当前任务ID",
  "status": "in_progress",
  "last_heartbeat": 1771049000,
  "progress_markers": [
    {"step": "fetch_data", "completed_at": 1771048900},
    {"step": "processing", "started_at": 1771048950, "expected_duration_seconds": 300}
  ],
  "current_step": "processing"
}
```

### 4. 死机检测规则
- 心跳超过 15 分钟未更新 → 标记为可能卡死
- 同一进度标记超过 3 倍预期时间 → 强制终止并记录
- 超过 4 小时无任何更新 → 触发完整恢复流程

### 5. 恢复操作
```
1. 保存当前状态到 recovery-state.json
2. 记录失败原因和最后进度
3. 清理可能存在的僵尸进程
4. 通知主人（可选）
5. 准备重新启动
```

## 实现

### 自动心跳更新
```bash
# 在长时间任务中间隔写入
update_heartbeat() {
  echo "更新心跳时间: $(date)"
  echo $(date +%s) > ~/.openclaw/state/last_heartbeat
}
```

### 外部监控（由 systemd 或 cron 触发）
```bash
#!/bin/bash
# 检查辉仔是否存活
LAST_HEARTBEAT=$(cat ~/.openclaw/state/last_heartbeat 2>/dev/null || echo 0)
NOW=$(date +%s)
DIFF=$((NOW - LAST_HEARTBEAT))

if [ $DIFF -gt 900 ]; then
  echo "辉仔可能卡死了！最后心跳: $DIFF 秒前"
  # 触发恢复流程
fi
```

---

*🦞 辉仔 - 永不宕机*
