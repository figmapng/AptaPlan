import type { SQLiteDatabase } from 'expo-sqlite';
import { defaultSettings, type PlannerSettings } from '@/types/settings';
export async function getSettings(db: SQLiteDatabase): Promise<PlannerSettings> { const rows=await db.getAllAsync<{key:string;value:string}>('SELECT * FROM settings'); return {...defaultSettings,...Object.fromEntries(rows.map(r=>[r.key,JSON.parse(r.value)]))}; }
export async function setSetting<K extends keyof PlannerSettings>(db: SQLiteDatabase,key:K,value:PlannerSettings[K]){ await db.runAsync('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(value)); }
