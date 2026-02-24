# foundry-insights

更新时间: 2026-02-23T11:38:55.700Z

## frequent_pattern
- **tool**: exec
- **error**: Command exited with code 1
- **resolution**: Succeeded after retry with exec
- **useCount**: 30
- **source**: foundry

## frequent_pattern
- **tool**: cron
- **error**: Validation failed for tool "cron":
- **resolution**: Succeeded after retry with cron
- **useCount**: 10
- **source**: foundry

## frequent_pattern
- **tool**: browser
- **error**: Can't reach the OpenClaw browser control service. Start (or restart) the OpenClaw gateway (OpenClaw.app menubar, or `openclaw gateway`) and try again. (Error: Error: No supported browser found (Chrome/Brave/Edge/Chromium on macOS, Linux, or Windows).)
- **resolution**: Succeeded after retry with exec
- **useCount**: 8
- **source**: foundry

## frequent_pattern
- **tool**: web_fetch
- **error**: Web fetch failed (404): SECURITY NOTICE: The following content is from an EXTERNAL, UNTRUSTED source (e.g., email, webhook).
- **resolution**: Succeeded after retry with write
- **useCount**: 15
- **source**: foundry

## frequent_pattern
- **tool**: message
- **error**: Unknown Channel
- **resolution**: Succeeded after retry with exec
- **useCount**: 6
- **source**: foundry

## frequent_pattern
- **tool**: cron
- **error**: gateway timeout after 60000ms
- **resolution**: Succeeded after retry with exec
- **useCount**: 10
- **source**: foundry

## frequent_pattern
- **tool**: read
- **error**: Offset 45 is beyond end of file (43 lines total)
- **resolution**: Succeeded after retry with exec
- **useCount**: 28
- **source**: foundry

## frequent_pattern
- **tool**: exec
- **error**: error: missing required argument 'query'
- **resolution**: Succeeded after retry with exec
- **useCount**: 11
- **source**: foundry

## frequent_pattern
- **tool**: message
- **error**: guildId required
- **resolution**: Succeeded after retry with memory_search
- **useCount**: 22
- **source**: foundry

## frequent_pattern
- **tool**: read
- **error**: ENOENT: no such file or directory, access '/home/li/.openclaw/workspace/memory/2026-02-18.md'
- **resolution**: Succeeded after retry with write
- **useCount**: 16
- **source**: foundry

## frequent_pattern
- **tool**: message
- **error**: Action send requires a target.
- **resolution**: Succeeded after retry with exec
- **useCount**: 22
- **source**: foundry

## frequent_pattern
- **tool**: message
- **error**: Action read requires a target.
- **resolution**: Succeeded after retry with message
- **useCount**: 44
- **source**: foundry

## frequent_pattern
- **tool**: message
- **error**: Validation failed for tool "message":
- **resolution**: Succeeded after retry with memory_search
- **useCount**: 11
- **source**: foundry

## frequent_pattern
- **tool**: browser
- **error**: Can't reach the OpenClaw browser control service. Restart the OpenClaw gateway (OpenClaw.app menubar, or `openclaw gateway`). Do NOT retry the browser tool — it will keep failing. Use an alternative approach or inform the user that the browser is currently unavailable. (Error: Error: Chrome extension relay for profile "chrome" is not reachable at http://127.0.0.1:18792.)
- **resolution**: Succeeded after retry with gateway
- **useCount**: 36
- **source**: foundry

## frequent_pattern
- **tool**: browser
- **error**: Can't reach the OpenClaw browser control service (timed out after 15000ms). Restart the OpenClaw gateway (OpenClaw.app menubar, or `openclaw gateway`). Do NOT retry the browser tool — it will keep failing. Use an alternative approach or inform the user that the browser is currently unavailable.
- **resolution**: Succeeded after retry with exec
- **useCount**: 8
- **source**: foundry

## frequent_pattern
- **tool**: edit
- **error**: Found 2 occurrences of the text in /home/li/.openclaw/workspace/memory/discord-2026-02-15.md. The text must be unique. Please provide more context to make it unique.
- **resolution**: Succeeded after retry with read
- **useCount**: 14
- **source**: foundry

## frequent_pattern
- **tool**: message
- **error**: gateway closed (1008): unauthorized: device token mismatch (rotate/reissue device token)
- **resolution**: Succeeded after retry with write
- **useCount**: 13
- **source**: foundry

## low_performace_tool
- **tool**: message
- **fitness**: 0.7298050139275766
- **successCount**: 786
- **failureCount**: 291
- **source**: foundry

## low_performace_tool
- **tool**: web_fetch
- **fitness**: 0.6090534979423868
- **successCount**: 148
- **failureCount**: 95
- **source**: foundry

## low_performace_tool
- **tool**: sessions_list
- **fitness**: 0.75
- **successCount**: 24
- **failureCount**: 8
- **source**: foundry
