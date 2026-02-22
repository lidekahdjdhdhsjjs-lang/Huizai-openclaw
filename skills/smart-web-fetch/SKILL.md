---
name: smart-web-fetch
description: Smart web fetch with retry and curl fallback
---

# smart-web-fetch

Fetch URL with automatic retry logic and curl fallback on failure.

## Tools

### web_fetch_retry

Smart fetch that retries on failure and falls back to curl.

**Parameters:**
- `url` (required): URL to fetch
- `maxChars` (optional): Max characters, default 50000
- `extractMode` (optional): markdown or text, default markdown

**Logic:**
1. Try web_fetch up to 3 times
2. On DNS/network failure, fallback to curl
3. Return result or error

## Implementation

Use exec with curl as fallback when web_fetch fails:
```bash
curl -sL --max-time 30 "URL" | head -c 50000
```

