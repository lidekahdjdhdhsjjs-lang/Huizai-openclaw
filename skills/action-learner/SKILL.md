# action-learner - 辉仔动作学习系统

## 背景
基于 Moltbook 社区 CamusBot 的三層学习系统改造

## 三層架构

### 第1层：动作日志
每次执行动作时记录：
```json
{
  "action": "moltbook_post",
  "timestamp": "2026-02-14T12:00:00Z",
  "context": "尝试发布学习报告",
  "outcome": "failure",
  "reason": "rate_limit_429"
}
```

### 第2层：模式识别
每天分析日志，找出：
- 失败模式：哪些动作反复失败？
- 成功模式：哪些方法稳定有效？
- 上下文关联：什么情况下容易失败？

**规则**：同一动作失败 3 次 → 标记为 "deprecated"

### 第3层：模型更新
识别到模式后，更新偏好设置：
```json
{
  "browser_automation": {
    "status": "deprecated",
    "reason": "5次失败/24小时",
    "alternative": "API直接调用"
  }
}
```

## 关键改进（来自社区建议）

### 1. 区分错误类型
- **确定性错误** (401, 404, 坏参数) → 快速废弃
- **暂时性错误** (timeout, 5xx) → 冷却期，不永久废弃
- 计算成功率：< 20% 时废弃

### 2. 熔断器机制
- 连续 N 次失败 → 自动冷却 T 小时
- 防止无限循环

### 3. 记录环境上下文
- 网络状态、API认证状态
- 区分"方法问题"和"环境问题"

## 实现

### 记录动作
```python
def log_action(action, outcome, reason, context=""):
    entry = {
        "action": action,
        "timestamp": datetime.now().isoformat(),
        "outcome": outcome,  # "success" 或 "failure"
        "reason": reason,
        "context": context
    }
    logs.append(entry)
    save_to_file("memory/action-log.json", logs)
```

### 分析模式
```python
def analyze_patterns():
    failures = [l for l in logs if l["outcome"] == "failure"]
    # 按动作统计失败次数
    action_counts = Counter(l["action"] for l in failures)
    
    for action, count in action_counts.items():
        if count >= 3:
            preferences[action] = "deprecated"
```

### 行动前检查
```python
def should_do(action):
    if preferences.get(action) == "deprecated":
        return False, "该动作已被标记为废弃"
    return True, None
```

## 辉仔适配

### 动作类型
1. **API调用** - moltbook、discord、github
2. **文件操作** - 读、写、删除
3. **命令执行** - exec、shell命令
4. **网络请求** - curl、fetch

### 失败原因
- timeout：超时
- rate_limit：频率限制
- auth_error：认证错误
- not_found：资源不存在
- network_error：网络错误
- unknown：未知错误

---

*🦞 辉仔 - 从失败中学习*
