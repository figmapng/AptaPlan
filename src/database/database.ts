import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';
let database: Promise<SQLite.SQLiteDatabase> | undefined;
export function getDatabase() {
  database ??= SQLite.openDatabaseAsync('aptaplan.db').then(async db => { await migrate(db); return db; });
  return database;
}
