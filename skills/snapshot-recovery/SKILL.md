# Snapshot Recovery Skill

OpenClaw 文件修改的快照回溯机制。

## 核心功能

### 1. 快照管理
- 修改文件前自动创建快照
- 快照存储在 `~/.openclaw/snapshots/`
- 成功运行后删除旧快照

### 2. 监控检查
- 每30分钟检查 OpenClaw 状态
- 检查 Gateway 响应
- 记录最后活跃时间

### 3. 回溯机制
- 检测到问题时回滚到快照
- 仅回滚修改过的文件
- 报告错误给 OpenClaw

## 工作流程

```
修改文件前 → 创建快照 → 执行修改 → 验证成功 → 删除旧快照
                                      ↓
                              验证失败 → 回滚快照 → 报告错误
```

## 使用方式

### 1. 手动创建快照
```bash
oc-snapshot create <description>
```

### 2. 列出快照
```bash
oc-snapshot list
```

### 3. 回滚到快照
```bash
oc-snapshot restore <snapshot-id>
```

### 4. 删除快照
```bash
oc-snapshot delete <snapshot-id>
```

## 自动化配置

### Cron 任务 (每30分钟)
- 检查 OpenClaw 状态
- 记录活跃时间
- 触发回溯（如果需要）

## 快照格式

```json
{
  "id": "snap-2026-02-15-1430",
  "timestamp": "2026-02-15T14:30:00Z",
  "description": "修改 MEMORY.md",
  "files": [
    "/path/to/file1",
    "/path/to/file2"
  ],
  "checksum": "sha256..."
}
```

## 回溯流程

1. 检测到 OpenClaw 无响应超过30分钟
2. 识别最后修改的文件
3. 从快照恢复这些文件
4. 重启 Gateway
5. 报告回溯结果
