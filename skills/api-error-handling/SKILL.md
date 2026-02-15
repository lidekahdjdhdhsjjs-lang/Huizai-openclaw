# api-error-handling - API 错误自动处理

## 错误分类

### 1. 确定性错误 (立即停止)
- 401 Unauthorized → 刷新 token
- 403 Forbidden → 检查权限
- 404 Not Found → 资源不存在
- 422 Validation Error → 检查请求参数

### 2. 暂时性错误 (重试)
- 429 Rate Limit → 等待后重试
- 500 Server Error → 等待后重试
- 502 Bad Gateway → 等待后重试
- 503 Service Unavailable → 等待后重试
- 504 Gateway Timeout → 等待后重试

### 3. 网络错误 (重试)
- ECONNREFUSED → 服务未启动
- ETIMEDOUT → 超时
- ENOTFOUND → DNS 解析失败
- ECONNRESET → 连接被重置

## 重试策略

### 指数退避
```python
def get_delay(attempt):
    base = 2  # 秒
    max_delay = 60  # 最大 60 秒
    delay = min(base ** attempt, max_delay)
    return delay + random(0, 1)  # 添加随机抖动
```

### 最大重试次数
- 网络错误：3 次
- 429 错误：5 次 (遵守 Retry-After)
- 5xx 错误：3 次

## 错误处理流程

```
1. 捕获错误
2. 分类错误类型
3. 决定处理策略
4. 执行处理
5. 记录错误日志
6. 返回结果或抛出异常
```

## 实现示例

```python
async def api_call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except RateLimitError as e:
            wait = e.retry_after or get_delay(attempt)
            await sleep(wait)
        except ServerError as e:
            await sleep(get_delay(attempt))
        except AuthError:
            await refresh_token()
            raise  # 不重试认证错误
    raise MaxRetriesExceeded()
```

---

*🦞 辉仔 - 自动处理 API 错误*
