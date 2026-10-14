// Minimal expo-sqlite compatible wrapper around Node's built-in SQLite, so the
// repository and migrations can be tested against a real database.
import type { SQLiteDatabase } from 'expo-sqlite';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

const params = (args: unknown[]) => (args.length === 1 && Array.isArray(args[0]) ? args[0] : args);

export function createTestDb(): SQLiteDatabase {
  const d = new DatabaseSync(':memory:');
  let inTransaction = false;
  const db = {
    execAsync: async (sql: string) => {
      d.exec(sql);
    },
    runAsync: async (sql: string, ...args: unknown[]) => {
      const r = d.prepare(sql).run(...params(args));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAllAsync: async (sql: string, ...args: unknown[]) => d.prepare(sql).all(...params(args)),
    getFirstAsync: async (sql: string, ...args: unknown[]) => d.prepare(sql).get(...params(args)) ?? null,
    getAllSync: (sql: string, ...args: unknown[]) => d.prepare(sql).all(...params(args)),
    withTransactionAsync: async (fn: () => Promise<void>) => {
      if (inTransaction) throw new Error('cannot start a transaction within a transaction');
      inTransaction = true;
      d.exec('BEGIN');
      try {
        await fn();
        d.exec('COMMIT');
      } catch (e) {
        d.exec('ROLLBACK');
        throw e;
      } finally {
        inTransaction = false;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}
