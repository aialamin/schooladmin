'use strict';
/**
 * mongodb.cjs — Embedded MongoDB lifecycle manager
 *
 * Uses mongodb-memory-server to spin up a real mongod process that persists
 * data to disk (userData/data/).  The mongod binary is cached in
 * userData/mongodb-bin/ so subsequent starts are instant and fully offline.
 *
 * First launch downloads the binary once (~80 MB); after that the app runs
 * 100 % offline.
 */

const path = require('path');
const fs   = require('fs');

class MongoDBManager {
  constructor(userDataPath) {
    this.userDataPath  = userDataPath;
    this.dataDir       = path.join(userDataPath, 'data');
    this.binDir        = path.join(userDataPath, 'mongodb-bin');
    this.mongod        = null;
    this.uri           = null;
  }

  async start(onStatus = () => {}) {
    // ── ensure directories exist ──────────────────────────────────────
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.mkdirSync(this.binDir,  { recursive: true });

    onStatus('Checking database engine…');

    // Point MMS at our cache dirs before importing so it honours them
    process.env.MONGOMS_DOWNLOAD_DIR  = this.binDir;
    process.env.MONGOMS_PREFER_GLOBAL_PATH = '1';

    // If the user shipped a bundled mongod binary inside extraResources, use it
    const bundledWin  = path.join(process.resourcesPath || '', 'mongodb-bin', 'mongod.exe');
    const bundledUnix = path.join(process.resourcesPath || '', 'mongodb-bin', 'mongod');
    const bundled     = process.platform === 'win32' ? bundledWin : bundledUnix;
    if (fs.existsSync(bundled)) {
      process.env.MONGOMS_SYSTEM_BINARY = bundled;
      onStatus('Using bundled database engine…');
    }

    const { MongoMemoryServer } = require('mongodb-memory-server');

    onStatus('Starting local database…');

    // Create a persistent MongoMemoryServer instance
    this.mongod = await MongoMemoryServer.create({
      instance: {
        port:          27017,
        dbPath:        this.dataDir,
        storageEngine: 'wiredTiger',
        args:          ['--quiet'],
      },
      binary: {
        version:     '7.0.14',
        downloadDir: this.binDir,
        // Silence the download progress log; we surface it via onStatus
        checkMD5:    false,
      },
    });

    this.uri = this.mongod.getUri();
    onStatus('Database ready ✓');
    console.log('[MongoDB] URI:', this.uri);
    return this.uri;
  }

  /** Stop without deleting the data directory. */
  async stop() {
    if (this.mongod) {
      await this.mongod.stop({ doCleanup: false });
      this.mongod = null;
    }
  }

  getUri() { return this.uri; }
}

module.exports = MongoDBManager;
