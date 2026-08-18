import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
let syncDb: SQLite.SQLiteDatabase | undefined;

export function getDatabaseSync(): SQLite.SQLiteDatabase {
  if (!syncDb) {
    syncDb = SQLite.openDatabaseSync('aptaplan.db');
  }
  return syncDb;
}

export function getDatabase() {
  database ??= SQLite.openDatabaseAsync('aptaplan.db').then(async db => { await migrate(db); return db; });
  return database;
}
