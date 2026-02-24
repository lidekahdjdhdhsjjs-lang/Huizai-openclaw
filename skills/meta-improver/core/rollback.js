const fs = require('fs');
const path = require('path');

class Rollback {
  constructor(config) {
    this.config = config;
    this.openclawDir = path.join(process.env.HOME, '.openclaw');
    this.snapshotsDir = path.join(this.openclawDir, 'workspace', 'meta-improver', 'snapshots');
    this.ensureDir(this.snapshotsDir);
  }

  ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  async createSnapshot(plan) {
    const id = `snapshot-${Date.now()}`;
    const snapshotDir = path.join(this.snapshotsDir, id);
    this.ensureDir(snapshotDir);
    this.ensureDir(path.join(snapshotDir, 'files'));

    const manifest = {
      id,
      createdAt: new Date().toISOString(),
      planId: plan.issueId,
      action: plan.action,
      files: []
    };

    const targets = this.getSnapshotTargets(plan);
    for (const target of targets) {
      if (fs.existsSync(target)) {
        const relativePath = target.replace(this.openclawDir, '');
        const backupPath = path.join(snapshotDir, 'files', relativePath.replace(/^\//, ''));
        this.ensureDir(path.dirname(backupPath));
        fs.copyFileSync(target, backupPath);
        manifest.files.push({
          original: target,
          backup: backupPath,
          relativePath
        });
      }
    }

    fs.writeFileSync(path.join(snapshotDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    return { id, path: snapshotDir, filesCount: manifest.files.length };
  }

  getSnapshotTargets(plan) {
    const targets = [];
    const action = plan.action;
    const category = plan.category;

    if (action === 'cleanup') {
      if (category === 'learning') {
        targets.push(path.join(this.openclawDir, 'foundry', 'learning.json'));
      }
      if (category === 'hooks') {
        targets.push(path.join(this.openclawDir, 'foundry', 'hooks'));
      }
      if (category === 'failures') {
        targets.push(path.join(this.openclawDir, 'foundry', 'failures'));
      }
    }

    if (action === 'optimize') {
      targets.push(path.join(this.openclawDir, 'foundry', 'learning.json'));
      targets.push(path.join(this.openclawDir, 'foundry', 'fitness.json'));
    }

    if (action === 'create') {
      if (category === 'fitness') {
        targets.push(path.join(this.openclawDir, 'foundry', 'hooks'));
      }
      if (category === 'skills') {
        targets.push(path.join(this.openclawDir, 'workspace', 'skills'));
      }
    }

    if (action === 'modify') {
      targets.push(path.join(this.openclawDir, 'openclaw.json'));
    }

    return [...new Set(targets)];
  }

  async rollback(snapshotId) {
    const snapshotDir = path.join(this.snapshotsDir, snapshotId);
    if (!fs.existsSync(snapshotDir)) {
      return { success: false, error: 'Snapshot not found' };
    }

    const manifestPath = path.join(snapshotDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    let restored = 0, failed = 0;

    for (const file of manifest.files) {
      try {
        if (fs.existsSync(file.backup)) {
          this.ensureDir(path.dirname(file.original));
          fs.copyFileSync(file.backup, file.original);
          restored++;
        }
      } catch (error) {
        failed++;
      }
    }

    return {
      success: true,
      snapshotId,
      restored,
      failed,
      rolledBackAt: new Date().toISOString()
    };
  }

  listSnapshots() {
    if (!fs.existsSync(this.snapshotsDir)) return [];

    return fs.readdirSync(this.snapshotsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('snapshot-'))
      .map(d => {
        try {
          const manifest = JSON.parse(fs.readFileSync(path.join(this.snapshotsDir, d.name, 'manifest.json'), 'utf-8'));
          return manifest;
        } catch {
          return { id: d.name, error: 'Invalid manifest' };
        }
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  deleteSnapshot(snapshotId) {
    const snapshotDir = path.join(this.snapshotsDir, snapshotId);
    if (fs.existsSync(snapshotDir)) {
      fs.rmSync(snapshotDir, { recursive: true });
      return true;
    }
    return false;
  }

  cleanupOldSnapshots(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const snapshots = this.listSnapshots();
    let deleted = 0;

    for (const snapshot of snapshots) {
      if (snapshot.createdAt) {
        const age = now - new Date(snapshot.createdAt).getTime();
        if (age > maxAge) {
          this.deleteSnapshot(snapshot.id);
          deleted++;
        }
      }
    }

    return deleted;
  }
}

module.exports = Rollback;
