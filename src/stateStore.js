const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

class StateStore {
  constructor(dbPath) {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this._init();
  }

  _init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notified_proposals (
        proposal_id TEXT PRIMARY KEY,
        notified_at TEXT NOT NULL,
        email_message_id TEXT,
        checksum TEXT
      );
    `);

    this.selectStmt = this.db.prepare(`
      SELECT proposal_id, notified_at, email_message_id, checksum
      FROM notified_proposals
      WHERE proposal_id = ?
      LIMIT 1
    `);

    this.insertStmt = this.db.prepare(`
      INSERT INTO notified_proposals (proposal_id, notified_at, email_message_id, checksum)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(proposal_id) DO UPDATE SET
        notified_at = excluded.notified_at,
        email_message_id = excluded.email_message_id,
        checksum = excluded.checksum
    `);
  }

  hasNotified(proposalId) {
    return Boolean(this.selectStmt.get(proposalId));
  }

  markNotified({ proposalId, emailMessageId = null, checksum = null }) {
    const nowIso = new Date().toISOString();
    this.insertStmt.run(proposalId, nowIso, emailMessageId, checksum);
  }

  close() {
    if (this.db) this.db.close();
  }
}

module.exports = { StateStore };
