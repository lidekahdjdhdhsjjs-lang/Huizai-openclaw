# restart-guard - 重启守护

## 功能
防止频繁重启、监控进程健康、自动恢复

## 核心机制

### 1. 重启频率限制
```json
{
  "min_restart_interval": 60,
  "max_restarts_per_hour": 5,
  "max_restarts_per_day": 20,
  "cooldown_period": 300
}
```

### 2. 健康检查
```python
async def health_check():
    results = {
        "process": check_process(),
        "memory": check_memory(),
        "disk": check_disk(),
        "network": check_network(),
        "api": check_api_connectivity()
    }
    
    if all(results.values()):
        return "healthy"
    elif any(results.values()):
        return "degraded"
    else:
        return "unhealthy"
```

### 3. 自动恢复决策树
```
进程崩溃?
  ├─ 是 → 检查重启频率
  │         ├─ 过于频繁 → 进入冷却期
  │         └─ 正常 → 重启进程
  │
  └─ 否 → 健康检查
            ├─ 健康 → 继续运行
            ├─ 降级 → 尝试修复
            └─ 不健康 → 重启
```

### 4. 告警阈值
```
内存使用 > 90%: 警告
内存使用 > 95%: 严重
磁盘使用 > 85%: 警告
磁盘使用 > 95%: 严重
连续崩溃 > 5次: 锁定重启
```

### 5. 恢复步骤
```bash
# 1. 保存当前状态
save_state()

# 2. 优雅停止
graceful_shutdown()

# 3. 清理资源
cleanup()

# 4. 重新启动
restart_process()

# 5. 验证健康
verify_health()

# 6. 恢复状态
restore_state()
```

---

*🦞 辉仔 - 稳定运行守护者*
