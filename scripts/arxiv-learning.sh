#!/bin/bash
# ArXiv学术论文学习

echo "📚 ArXiv AI/Agent 论文学习..."

# 获取AI分类的最新论文
curl -s "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL+OR+cat:cs.NE&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending" | \
  python3 -c "
import sys, xml.etree.ElementTree as ET
tree = ET.fromstring(sys.stdin.read())
ns = {'atom': 'http://www.w3.org/2005/Atom'}
for entry in tree.findall('.//atom:entry', ns)[:10]:
    title = entry.find('atom:title', ns).text.strip().replace('\n', ' ')[:70]
    published = entry.find('atom:published', ns).text[:10]
    print(f'[{published}] {title}')
" 2>/dev/null

echo "=== 学习完成 ==="
