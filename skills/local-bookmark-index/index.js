const fs = require('fs');
const path = require('path');
const { IndexerCore } = require('../shared/indexer-core');
const { SearcherCore } = require('../shared/searcher-core');

class BookmarkIndex {
  constructor(options = {}) {
    this.indexer = new IndexerCore({ 
      indexPath: options.indexPath || path.join(process.env.HOME, '.openclaw', 'cache', 'bookmarks')
    });
    this.searcher = new SearcherCore(this.indexer);
    this.bookmarkPaths = options.paths || this.detectBookmarkPaths();
  }

  detectBookmarkPaths() {
    const paths = [];
    const home = process.env.HOME;
    
    // Chrome
    const chromePath = path.join(home, '.config', 'google-chrome', 'Default', 'Bookmarks');
    if (fs.existsSync(chromePath)) paths.push({ browser: 'chrome', path: chromePath });
    
    // Firefox
    const firefoxDir = path.join(home, '.mozilla', 'firefox');
    if (fs.existsSync(firefoxDir)) {
      const profiles = fs.readdirSync(firefoxDir).filter(d => d.endsWith('.default'));
      profiles.forEach(p => {
        const dbPath = path.join(firefoxDir, p, 'places.sqlite');
        if (fs.existsSync(dbPath)) paths.push({ browser: 'firefox', path: dbPath });
      });
    }
    
    // Brave
    const bravePath = path.join(home, '.config', 'BraveSoftware', 'Brave-Browser', 'Default', 'Bookmarks');
    if (fs.existsSync(bravePath)) paths.push({ browser: 'brave', path: bravePath });
    
    return paths;
  }

  import() {
    let imported = 0;
    
    for (const { browser, path: bookmarkPath } of this.bookmarkPaths) {
      if (browser === 'chrome' || browser === 'brave') {
        imported += this.importChromium(bookmarkPath, browser);
      } else if (browser === 'firefox') {
        imported += this.importFirefox(bookmarkPath);
      }
    }
    
    return imported;
  }

  importChromium(bookmarkPath, browser) {
    const data = JSON.parse(fs.readFileSync(bookmarkPath, 'utf-8'));
    let count = 0;
    
    const walk = (node, folder = '') => {
      if (node.type === 'url') {
        const id = `${browser}-${node.id || count}`;
        this.indexer.index(id, `${node.name} ${node.url}`, {
          title: node.name,
          url: node.url,
          browser,
          folder,
          addedAt: node.date_added
        });
        count++;
      } else if (node.type === 'folder' && node.children) {
        node.children.forEach(child => walk(child, folder ? `${folder}/${node.name}` : node.name));
      }
    };
    
    if (data.roots) {
      Object.values(data.roots).forEach(root => walk(root));
    }
    
    return count;
  }

  importFirefox(dbPath) {
    // Firefox uses SQLite - simplified approach
    // In real implementation, would use sqlite3 module
    return 0;
  }

  add(bookmark) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.indexer.index(id, `${bookmark.title} ${bookmark.url}`, {
      title: bookmark.title,
      url: bookmark.url,
      tags: bookmark.tags || [],
      note: bookmark.note || '',
      browser: 'custom',
      addedAt: Date.now()
    });
    return id;
  }

  remove(id) {
    this.indexer.delete(id);
  }

  search(query, options = {}) {
    return this.searcher.search(query, options);
  }

  suggest(query) {
    return this.searcher.suggest(query);
  }

  getByTag(tag) {
    const results = [];
    for (const [id, entry] of this.indexer.cache) {
      if ((entry.metadata.tags || []).includes(tag)) {
        results.push(entry);
      }
    }
    return results;
  }

  getByFolder(folder) {
    const results = [];
    for (const [id, entry] of this.indexer.cache) {
      if ((entry.metadata.folder || '').startsWith(folder)) {
        results.push(entry);
      }
    }
    return results;
  }

  listBrowsers() {
    return this.bookmarkPaths.map(p => p.browser);
  }

  stats() {
    const stats = this.indexer.stats();
    const byBrowser = {};
    
    for (const entry of this.indexer.cache.values()) {
      const browser = entry.metadata.browser || 'unknown';
      byBrowser[browser] = (byBrowser[browser] || 0) + 1;
    }
    
    return { ...stats, byBrowser };
  }

  export(format = 'json') {
    const bookmarks = Array.from(this.indexer.cache.values()).map(e => ({
      title: e.metadata.title,
      url: e.metadata.url,
      tags: e.metadata.tags,
      folder: e.metadata.folder,
      browser: e.metadata.browser
    }));
    
    if (format === 'html') {
      return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${bookmarks.map(b => `    <DT><A HREF="${b.url}">${b.title}</A>`).join('\n')}
</DL><p>`;
    }
    
    return JSON.stringify(bookmarks, null, 2);
  }
}

module.exports = { BookmarkIndex };
