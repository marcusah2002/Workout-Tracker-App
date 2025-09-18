import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export type Workout = {
  id: number;
  date: string;
  notes?: string | null;
  ended_at?: string | null;
};

export type SetRow = {
  id: number;
  workout_id: number;
  exercise: string;
  reps: number;
  weight: number | null;
  unit?: string | null;
};

const isWeb = Platform.OS === 'web';

let db: SQLite.SQLiteDatabase | null = null;

async function initDbNative() {
  db = SQLite.openDatabaseSync('workouts.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      ended_at TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY NOT NULL,
      workout_id INTEGER NOT NULL,
      exercise TEXT NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL,
      unit TEXT DEFAULT 'kg',
      FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN ended_at TEXT;`);
  } catch {}
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) await initDbNative();
  return db!;
}

async function allNative<T = any>(sql: string, params: any[] = []) {
  const d = await getDb();
  return d.getAllAsync<T>(sql, params);
}

async function runNative(sql: string, params: any[] = []) {
  const d = await getDb();
  await d.runAsync(sql, params);
}

const listKey = (date: string) => `workouts_${date}`;
const legacyKey = (date: string) => `workout_${date}`; 
const setsKey = (workoutId: number) => `sets_${workoutId}`;

async function initDbWeb() {
}

function migrateIfNeeded(date: string) {
  const oldRaw = localStorage.getItem(legacyKey(date));
  const newRaw = localStorage.getItem(listKey(date));
  if (oldRaw && !newRaw) {
    const w = JSON.parse(oldRaw) as Workout;
    localStorage.setItem(listKey(date), JSON.stringify([w]));
    localStorage.removeItem(legacyKey(date));
  }
}

function getList(date: string): Workout[] {
  migrateIfNeeded(date);
  const raw = localStorage.getItem(listKey(date));
  return raw ? (JSON.parse(raw) as Workout[]) : [];
}
function setList(date: string, arr: Workout[]) {
  localStorage.setItem(listKey(date), JSON.stringify(arr));
}

function getSetsList(workoutId: number): SetRow[] {
  const raw = localStorage.getItem(setsKey(workoutId));
  return raw ? (JSON.parse(raw) as SetRow[]) : [];
}
function setSetsList(workoutId: number, arr: SetRow[]) {
  localStorage.setItem(setsKey(workoutId), JSON.stringify(arr));
}

async function allWeb<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const trimmed = sql.trim();

  if (/^SELECT \* FROM workouts WHERE date=\?/i.test(trimmed)) {
    const date = String(params[0]);
    const arr = getList(date).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    if (/LIMIT\s+1/i.test(trimmed)) {
      return (arr[0] ? [arr[0]] : []) as T[];
    }
    return arr as T[];
  }

  if (/^SELECT \* FROM workouts(?:\s+ORDER BY .*)?$/i.test(trimmed)) {
    const allDates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.startsWith('workouts_')) {
        allDates.push(k.replace('workouts_', ''));
      }
    }
    let out: Workout[] = [];
    for (const d of allDates) out = out.concat(getList(d));
    if (/ORDER BY\s+date\s+DESC/i.test(trimmed)) {
      out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    }
    return out as T[];
  }

  if (/^SELECT \* FROM sets WHERE workout_id=\? ORDER BY id DESC$/i.test(trimmed)) {
    const wid = Number(params[0]);
    const arr = getSetsList(wid).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return arr as T[];
  }

  throw new Error(`Web fallback: unsupported SELECT: ${sql}`);
}

async function runWeb(sql: string, params: any[] = []): Promise<void> {
  const trimmed = sql.trim();

  if (/^INSERT INTO workouts \(date\) VALUES \(\?\)$/i.test(trimmed)) {
    const date = String(params[0]);
    const arr = getList(date);
    arr.push({ id: Date.now(), date, notes: null, ended_at: null });
    setList(date, arr);
    return;
  }

  if (/^UPDATE workouts SET ended_at=\? WHERE date=\? AND ended_at IS NULL$/i.test(trimmed)) {
    const endedAt = String(params[0]);
    const date = String(params[1]);
    const arr = getList(date);
    const idx = arr.findIndex(w => !w.ended_at); 
    if (idx !== -1) {
      arr[idx].ended_at = endedAt;
      setList(date, arr);
    }
    return;
  }

  if (/^INSERT INTO sets \(workout_id, exercise, reps, weight, unit\) VALUES \(\?,\?,\?,\?,\?\)$/i.test(trimmed)) {
    const [workoutId, exercise, reps, weight, unit] = params;
    const wid = Number(workoutId);
    const list = getSetsList(wid);
    const row: SetRow = {
      id: Date.now(),
      workout_id: wid,
      exercise: String(exercise),
      reps: Number(reps),
      weight: weight != null ? Number(weight) : null,
      unit: unit ? String(unit) : 'kg',
    };
    list.push(row);
    setSetsList(wid, list);
    return;
  }

  if (/^DELETE FROM sets WHERE id=\?$/i.test(trimmed)) {
    const id = Number(params[0]);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('sets_')) {
        const wid = Number(key.replace('sets_', ''));
        const list = getSetsList(wid).filter(s => s.id !== id);
        setSetsList(wid, list);
      }
    }
    return;
  }

  throw new Error(`Web fallback: unsupported mutation: ${sql}`);
}

export async function initDb() {
  return isWeb ? initDbWeb() : initDbNative();
}

export async function all<T = any>(sql: string, params: any[] = []) {
  return isWeb ? allWeb<T>(sql, params) : allNative<T>(sql, params);
}

export async function run(sql: string, params: any[] = []) {
  return isWeb ? runWeb(sql, params) : runNative(sql, params);
}

export async function stopWorkoutForDate(dateISO: string) {
  const endedAt = new Date().toISOString();

  if (isWeb) {
    await run(
      `UPDATE workouts SET ended_at=? WHERE date=? AND ended_at IS NULL`,
      [endedAt, dateISO]
    );
    return;
  }

  
  await run(
    `UPDATE workouts
     SET ended_at=?
     WHERE id = (
       SELECT id FROM workouts
       WHERE date = ? AND ended_at IS NULL
       ORDER BY id DESC
       LIMIT 1
     )`,
    [endedAt, dateISO]
  );
}


export async function getSetsForWorkout(workoutId: number): Promise<SetRow[]> {
  return all<SetRow>(
    `SELECT * FROM sets WHERE workout_id=? ORDER BY id DESC`,
    [workoutId]
  );
}

export async function addSet(
  workoutId: number,
  exercise: string,
  reps: number,
  weight?: number,
  unit: string = 'kg'
): Promise<void> {
  await run(
    `INSERT INTO sets (workout_id, exercise, reps, weight, unit) VALUES (?,?,?,?,?)`,
    [workoutId, exercise.trim(), Number(reps), weight != null ? Number(weight) : null, unit]
  );
}

export async function deleteSet(id: number): Promise<void> {
  await run(`DELETE FROM sets WHERE id=?`, [id]);
}

export async function editSet(
  workoutId: number,
  exercise: string,
  reps: number,
  weight: number | null,
  unit: string
): Promise<void> {
  await run(
    `UPDATE sets SET reps=?, weight=?, exercise=?, unit=? WHERE id=?`,
    [workoutId, exercise, reps, weight, unit]
  );
}
