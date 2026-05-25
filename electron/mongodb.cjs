'use strict';
/**
 * mongodb.cjs — Embedded MongoDB lifecycle manager
 *
 * Uses mongodb-memory-server to spin up a real mongod process that persists
 * data to disk (userData/data/).  The mongod binary is bundled inside the
 * installer (resources/mongodb-bin/mongod.exe) so the app runs 100% offline
 * from the very first launch — no download required.
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

    // Resolve bundled mongod binary — checked in priority order:
    //   1. extraResources path (packaged app)
    //   2. resources/ folder (dev mode)
    const ext        = process.platform === 'win32' ? 'mongod.exe' : 'mongod';
    const candidates = [
      path.join(process.resourcesPath || '', 'mongodb-bin', ext),
      path.join(__dirname, '..', 'resources', 'mongodb-bin', ext),
    ];
    const bundled = candidates.find(fs.existsSync);
    if (bundled) {
      process.env.MONGOMS_SYSTEM_BINARY = bundled;
      onStatus('Using bundled database engine…');
      console.log('[MongoDB] Using bundled binary:', bundled);
    } else {
      onStatus('Downloading database engine (first run only)…');
    }

    const { MongoMemoryServer } = require('mongodb-memory-server');

    onStatus('Starting local database…');

    // Create a persistent MongoMemoryServer instance.
    // No fixed port — lets the OS assign a free one so the app never
    // conflicts with a system MongoDB installation on the client machine.
    this.mongod = await MongoMemoryServer.create({
      instance: {
        dbPath:        this.dataDir,
        storageEngine: 'wiredTiger',
        args:          ['--quiet'],
      },
      binary: {
        version:     '8.3.2',
        downloadDir: this.binDir,
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
