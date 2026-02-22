# VSCodium AI 编程助手

通过 VSCodium + Continue 扩展实现 AI 编程辅助。

## 前置要求

- VSCodium 已安装 (`which codium`)
- Continue 扩展已安装
- MiniMax API 已配置

## 功能

- AI 代码补全和生成
- 自然语言编程
- 代码解释和重构
- Bug 修复
- 项目分析

## 工具

### codium_open
打开 VSCodium 并加载项目

### codium_file
在 VSCodium 中打开指定文件

### codium_terminal
在 VSCodium 终端执行命令

## 使用示例

```
用户: 帮我用 VSCodium 写一个 Hello World
→ 打开 VSCodium，创建新文件，输入代码
```

## 快捷键

- `Ctrl+L` - 打开 AI 聊天
- `Ctrl+I` - 选中代码后唤起 AI 改写
- `Ctrl+Shift+P` - 命令面板

## 启动命令

```bash
# 打开新窗口
codium --new-window

# 打开指定文件
codium /path/to/file

# 打开指定目录
codium /path/to/directory

# 比较两个文件
codium --diff file1.cpp file2.cpp
```

## 检查配置

```bash
# 检查 VSCodium
which codium

# 检查 Continue 配置
cat ~/.continue/config.json

# 检查 VSCodium 设置
cat ~/.config/VSCodium/User/settings.json
```
