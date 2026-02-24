# local-bookmark-index

本地书签索引技能，支持多浏览器书签导入和搜索。

## 功能

- **多浏览器支持**: Chrome, Firefox, Brave
- **自动检测**: 自动发现浏览器书签文件
- **导入**: 从浏览器导入书签
- **搜索**: 全文搜索书签
- **标签管理**: 按标签筛选
- **文件夹浏览**: 按文件夹筛选
- **导出**: JSON/HTML格式导出
- **自定义书签**: 添加自定义书签

## 使用

```javascript
const { BookmarkIndex } = require('local-bookmark-index');

const bookmarks = new BookmarkIndex();

// 导入浏览器书签
const count = bookmarks.import();

// 搜索
const results = bookmarks.search('openai');

// 按标签筛选
const tagged = bookmarks.getByTag('ai');

// 添加自定义书签
const id = bookmarks.add({
  title: 'My Bookmark',
  url: 'https://example.com',
  tags: ['important']
});

// 导出
const html = bookmarks.export('html');

// 统计
const stats = bookmarks.stats();
```

## 配置

可选指定自定义索引路径和书签路径：

```javascript
const bookmarks = new BookmarkIndex({
  indexPath: '/path/to/index',
  paths: [{ browser: 'chrome', path: '/path/to/Bookmarks' }]
});
```
