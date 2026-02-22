#!/bin/bash
# 邮箱登录脚本

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "用法: email_login.sh <邮箱> <密码>"
    echo "示例: email_login.sh mbou7@rurl.vip 16Y57q3ZQg"
    exit 1
fi

# 提取域名
DOMAIN=$(echo "$EMAIL" | cut -d@ -f2)

echo "正在登录邮箱: $EMAIL"
echo "域名: $DOMAIN"

# 根据域名选择登录URL
case "$DOMAIN" in
    "rurl.vip")
        URL="https://mail.rurl.vip/"
        ;;
    "gmail.com"|"googlemail.com")
        URL="https://mail.google.com"
        ;;
    "qq.com")
        URL="https://mail.qq.com"
        ;;
    "163.com"|"126.com"|"yeah.net")
        URL="https://mail.${DOMAIN}"
        ;;
    "outlook.com"|"hotmail.com"|"live.com")
        URL="https://outlook.live.com"
        ;;
    *)
        echo "不支持的邮箱域名: $DOMAIN"
        exit 1
        ;;
esac

echo "登录URL: $URL"

# 使用OpenClaw浏览器打开邮箱登录页面
codium --new-window "$URL" 2>/dev/null || true

echo "请在浏览器中完成登录"
