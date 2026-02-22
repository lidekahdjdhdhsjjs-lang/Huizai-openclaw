# auto-updater - 自动更新

## 功能
检测更新、自动下载、平滑升级

## 核心机制

### 1. 更新源
```json
{
  "sources": [
    "openclaw:updates",
    "github:releases",
    "npm:packages"
  ],
  "check_interval": 3600,
  "auto_update": false
}
```

### 2. 版本检查
```python
async def check_for_updates():
    current = get_current_version()
    latest = fetch_latest_version()
    
    if latest > current:
        return {
            "update_available": True,
            "current_version": current,
            "latest_version": latest,
            "changes": fetch_changelog(current, latest),
            "breaking": has_breaking_changes()
        }
    
    return {"update_available": False}
```

### 3. 更新策略
```
手动模式:
  - 检测到更新 → 通知用户
  - 用户确认 → 执行更新
  - 用户拒绝 → 跳过

自动模式:
  - 非核心更新: 静默安装
  - 核心更新: 通知后安装
  - 紧急更新: 立即安装
```

### 4. 更新流程
```bash
# 1. 备份当前版本
backup_current()

# 2. 下载更新
download_update()

# 3. 验证签名
verify_signature()

# 4. 应用更新
apply_update()

# 5. 验证功能
verify_functionality()

# 6. 回滚 (如果失败)
rollback_if_needed()
```

### 5. 回滚机制
```python
async def safe_update():
    try:
        backup_state()
        apply_update()
        verify_health()
    except Error as e:
        log_error(e)
        rollback()
        notify_admin()
        raise UpdateFailed()
```

---

*🦞 辉仔 - 持续进化*
