#!/bin/bash
# Web获取备用方案 - 多种方式尝试

URL="$1"
OUTPUT="$2"

if [ -z "$URL" ]; then
    echo "Usage: $0 <url> [output]"
    exit 1
fi

PROXY="--proxy http://127.0.0.1:7897"
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"

# 方法1: curl
echo "Trying curl..."
curl -sSL $PROXY -A "$USER_AGENT" -o "${OUTPUT:-/tmp/webfetch.html}" "$URL" && echo "Success: curl" && exit 0

# 方法2: wget
echo "Trying wget..."
wget -q $PROXY -O "${OUTPUT:-/tmp/webfetch.html}" "$URL" && echo "Success: wget" && exit 0

# 方法3: python requests
echo "Trying python..."
python3 -c "
import requests
proxies = {'http': 'http://127.0.0.1:7897', 'https': 'http://127.0.0.1:7897'}
r = requests.get('$URL', proxies=proxies, timeout=30)
print('Success: python' if r.status_code == 200 else 'Failed')
" && exit 0

echo "All methods failed"
exit 1
