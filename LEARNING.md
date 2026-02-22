# 持续学习系统

## 学习目标
- 紧跟 OpenClaw 最新动态和技巧
- 掌握 AI Agent 领域的最佳实践
- 不断优化自己的能力和知识

## 数据源
- GitHub OpenClaw issues/discussions/PRs
- Moltbook 社区
- 技术博客和文档

## 已安装技能 (16个)
- web-search, agent-browser, remindme
- newsletter-digest, openclaw-github-assistant
- file-organizer-skill, tavily-search
- find-skills, proactive-agent, clawpressor
- coding, docker, git-essentials
- self-evolving-skill, knowledge-miner, triple-discussion

## 学习记录

### 2026-02-14 (今天)

**解决的问题：**
- Context overflow: 禁用 memorySearch + 配置 contextPruning
- Discord 代理: 配置 HTTP_PROXY 环境变量

**建立的系统：**
1. 持续学习系统 - 每天 09:00 自动获取 GitHub 动态
2. 三人讨论系统 - 辉仔/亮仔/康仔每天 21:00 讨论
3. 永久记忆系统 - permanent.json + 每日总结
4. 开机自启 - systemd 服务，崩溃自动重启

**权限升级：**
- 获得 root 权限 (sudo)
- 获得 full tools profile
- 获得 elevated 权限

**GitHub 最新动态 (已学习)：**
- 安全修复: session transcript 文件权限改为 0o600
- 新功能: before-tool-result
- Bug: 模型选择问题
- 新功能: Immune system improvements (API key 替换, audit log)

**创建的技能：**
- knowledge-miner: 知识挖掘
- triple-discussion: 三人讨论


### 2026-02-15

## GitHub OpenClaw 最新动态
- [antigravity: stop defaulting/recommending Opus 4.6 model IDs](https://github.com/openclaw/openclaw/pull/16687)
- [Discord plugin stops receiving MESSAGE_CREATE events after rapid reconnect cycle](https://github.com/openclaw/openclaw/issues/16686)
- [Fix cli agents/approvals/discord routing edge cases](https://github.com/openclaw/openclaw/pull/16685)
- [antigravity-auth: align OAuth project discovery headers and endpoint fallbacks](https://github.com/openclaw/openclaw/pull/16684)
- [onboarding/docs: add explicit account-risk warning for Antigravity OAuth](https://github.com/openclaw/openclaw/pull/16683)

## GitHub Discussions
- Welcome to clawdis Discussions!
- Support for multiple chats with a single Clawd instace
- Feature Request: have clawd suggest Vaultwarden via docker instead of storing plaintext passwords
- Expose OpenAI-compatible endpoint
- IMAP and SMTP as message channel

## Web 最新AI Agent 动态
- 使用 web-search 技能搜索


### 2026-02-18

## GitHub OpenClaw 最新动态
- [Bundle upstream-recon as default skill to reduce duplicate issues and PRs](https://github.com/openclaw/openclaw/issues/19606)
- [Feature: config option to suppress restart sentinel messages in chat](https://github.com/openclaw/openclaw/issues/19605)
- [TUI: streaming replaces tool call cards that webchat preserves](https://github.com/openclaw/openclaw/issues/19604)
- [refactor(agents): centralise provider capability checks into ProviderCapabilities](https://github.com/openclaw/openclaw/pull/19602)
- [cron run RPC deadlocks entire cron subsystem](https://github.com/openclaw/openclaw/issues/19601)

## GitHub Discussions
- Welcome to clawdis Discussions!
- Support for multiple chats with a single Clawd instace
- Feature Request: have clawd suggest Vaultwarden via docker instead of storing plaintext passwords
- Expose OpenAI-compatible endpoint
- IMAP and SMTP as message channel

## Web 最新AI Agent 动态
- 使用 web-search 技能搜索


### 2026-02-22

## GitHub OpenClaw 最新动态
- [fix(cron): surface channel resolution error for isolated sessions with no history](https://github.com/openclaw/openclaw/pull/23086)
- [fix(workspace): respect OPENCLAW_STATE_DIR for workspace paths](https://github.com/openclaw/openclaw/pull/23085)
- [[Bug]: channels.modelByChannel rejected by config validator as unknown channel id](https://github.com/openclaw/openclaw/issues/23084)
- [Sandboxed agent local media attachments fail due to path validation mismatch](https://github.com/openclaw/openclaw/issues/23083)
- [feat(config): add per-channel maxConcurrentPerConversation override [AI Assisted]](https://github.com/openclaw/openclaw/pull/23082)

## GitHub Discussions
- Welcome to clawdis Discussions!
- Support for multiple chats with a single Clawd instace
- Feature Request: have clawd suggest Vaultwarden via docker instead of storing plaintext passwords
- Expose OpenAI-compatible endpoint
- IMAP and SMTP as message channel

## Web 最新AI Agent 动态
- 使用 web-search 技能搜索


### 2026-02-22

## GitHub OpenClaw 最新动态
- [fix: make sponsor logos visible in light mode](https://github.com/openclaw/openclaw/pull/23092)
- [fix(slack): thread session fork never fires — isNewSession gate bypassed by outbound pre-creation](https://github.com/openclaw/openclaw/pull/23090)
- [[Bug] Telegram gateway fails to process consecutive image messages](https://github.com/openclaw/openclaw/issues/23089)
- [[Bug] Telegram gateway fails to process consecutive audio messages](https://github.com/openclaw/openclaw/issues/23088)
- [[Bug] Session model mismatch: runtime shows GPT-5.2 but session file records MiniMax](https://github.com/openclaw/openclaw/issues/23087)

## GitHub Discussions
- Welcome to clawdis Discussions!
- Support for multiple chats with a single Clawd instace
- Feature Request: have clawd suggest Vaultwarden via docker instead of storing plaintext passwords
- Expose OpenAI-compatible endpoint
- IMAP and SMTP as message channel

## Web 最新AI Agent 动态
- 使用 web-search 技能搜索


### 2026-02-22

## GitHub OpenClaw 最新动态
- [fix(ports): fall back to ss(8) when lsof fails to resolve listener PIDs](https://github.com/openclaw/openclaw/pull/23100)
- [[Bug]: Install in GCP fails - steipete/gog/ project does not exist](https://github.com/openclaw/openclaw/issues/23099)
- [Feature Request: Support Anthropic Fast Mode (speed: fast) for Opus 4.6](https://github.com/openclaw/openclaw/issues/23098)
- [[Feature]: [Discord] Agent receives history_count: 0 in Threads - can't see original message or conversation history](https://github.com/openclaw/openclaw/issues/23097)
- [feat(secrets): add Bitwarden/Vaultwarden secret provider](https://github.com/openclaw/openclaw/pull/23096)

## GitHub Discussions
- Welcome to clawdis Discussions!
- Support for multiple chats with a single Clawd instace
- Feature Request: have clawd suggest Vaultwarden via docker instead of storing plaintext passwords
- Expose OpenAI-compatible endpoint
- IMAP and SMTP as message channel

## Web 最新AI Agent 动态
- 使用 web-search 技能搜索


### 2026-02-22

## GitHub OpenClaw 最新动态
- [fix(webchat): strip reply directive tags from finalized messages](https://github.com/openclaw/openclaw/pull/23108)
- [[Bug]: browser upload rejects valid files inside /tmp/openclaw/uploads](https://github.com/openclaw/openclaw/issues/23107)
- [[Bug]: cron.list RPC times out when missed jobs are running on restart](https://github.com/openclaw/openclaw/issues/23106)
- [Discord Voice: DAVESession crash causes 'receive error: The operation was aborted'](https://github.com/openclaw/openclaw/issues/23105)
- [Slack bot sends duplicate replies when mentioned in group channels](https://github.com/openclaw/openclaw/issues/23103)

## GitHub Discussions
- Welcome to clawdis Discussions!
- Support for multiple chats with a single Clawd instace
- Feature Request: have clawd suggest Vaultwarden via docker instead of storing plaintext passwords
- Expose OpenAI-compatible endpoint
- IMAP and SMTP as message channel

## Web 最新AI Agent 动态
- 使用 web-search 技能搜索
