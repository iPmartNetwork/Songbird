export const migration025AdminPanel = {
  version: 25,
  up: ({ db, tableExists, hasColumn }) => {
    if (tableExists("users") && !hasColumn("users", "role")) {
      db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER,
        actor_username TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
      ON admin_audit_logs(created_at)
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor
      ON admin_audit_logs(actor_user_id)
    `);
  },
};
