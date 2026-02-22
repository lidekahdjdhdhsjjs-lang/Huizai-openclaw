# cron-retry - 失败任务自动重试

## 功能
监控 cron 任务失败并自动重试

## 核心机制

### 1. 任务状态追踪
```json
{
  "task_id": "moltbook-fetch",
  "status": "running" | "success" | "failed",
  "attempts": 0,
  "last_run": "2026-02-14T12:00:00Z",
  "last_error": null,
  "max_attempts": 3
}
```

### 2. 重试策略
- **立即重试**: 网络瞬时波动
- **延迟重试**: 临时性故障 (5s, 15s, 30s)
- **指数退避**: 持续故障 (1m, 5m, 15m)
- **放弃**: 达到最大重试次数

### 3. 失败条件
```
1. 进程退出码非0
2. 执行超时
3. 抛出未捕获异常
4. 返回错误结果
```

### 4. 恢复动作
```python
async def handle_failure(task):
    if task.attempts < task.max_attempts:
        # 记录失败
        log_failure(task)
        
        # 计算延迟
        delay = calculate_delay(task.attempts)
        
        # 安排重试
        schedule_retry(task, delay)
    else:
        # 放弃任务
        notify_failure(task)
        escalate(task)
```

### 5. 监控面板
```
┌─────────────────────────────────────┐
│ Task: moltbook-fetch                │
│ Status: 🔄 Retrying (2/3)           │
│ Last Run: 12:00:00                  │
│ Last Error: Connection timeout      │
│ Next Retry: 12:00:15                │
└─────────────────────────────────────┘
```

## 实现

### 守护进程
```python
# 伪代码
while True:
    tasks = load_pending_tasks()
    for task in tasks:
        if is_overdue(task):
            if task.attempts < task.max_attempts:
                retry_task(task)
            else:
                mark_failed(task)
                notify_admin(task)
    await sleep(10)
```

---

*🦞 辉仔 - 任务永不放弃*
