import * as SQLite from "expo-sqlite";

export type Workout = {
  id: number;
  date: string;
  name: string;
  notes?: string | null;
  ended_at?: string | null;
  started_at?: string | null;
};

export type SetRow = {
  id: number;
  workout_id: number;
  exercise: string;
  reps: number;
  weight: number | null;
  unit?: string | null;
};

export type RecentExercise = {
  exercise: string;
  lastDate: string;
  setCount: string;
}

export type ExerciseHistoryRow = {
  workout_id: number;
  date: string;
  exercise: string;
  reps: number;
  weight: number | null;
  unit: number | null;
}

export type DailyMaxRow = {
  date: string; 
  maxWeight: number; 
  reps: number;        
};

export async function getDailyMaxWeight(exercise: string): Promise<DailyMaxRow[]> {
  return all<DailyMaxRow>(
    `
    SELECT w.date, s.weight AS maxWeight, s.reps
    FROM sets s
    JOIN workouts w ON w.id = s.workout_id
    WHERE LOWER(s.exercise) = LOWER(?)
      AND s.weight IS NOT NULL
    ORDER BY w.date ASC, s.weight DESC
    `,
    [exercise.trim()]
  ).then(rows => {
    const bestPerDay: Record<string, DailyMaxRow> = {};
    for (const row of rows) {
      if (!bestPerDay[row.date]) {
        bestPerDay[row.date] = row;
      }
    }
    return Object.values(bestPerDay);
  });
}


export async function getExerciseHistory(
  exercise: string
): Promise<ExerciseHistoryRow[]>{
  return all <ExerciseHistoryRow>(
    `
    SELECT
      s.workout_id,
      w.date,
      s.exercise,
      s.reps,
      s.weight,
      s.unit
    FROM sets s
    JOIN workouts w ON w.id = s.workout_id
    WHERE LOWER(s.exercise) = LOWER(?)
    ORDER BY w.date ASC, s.workout_id ASC, s.id ASC
    `,
    [exercise.trim()]
  );
}

export async function getRecentExercises(limit: number = 10): Promise<RecentExercise[]> {
  const rows = await all<RecentExercise & { displayName: string }>(
    `
    SELECT
      MIN(s.exercise) AS displayName,               
      MAX(w.date)     AS lastDate,                  
      COUNT(*)        AS setCount
    FROM sets s
    JOIN workouts w ON w.id = s.workout_id
    GROUP BY LOWER(s.exercise)
    ORDER BY lastDate DESC
    LIMIT ?
    `,
    [limit]
  );

  return rows.map(r => ({
    exercise: r.displayName,
    lastDate: r.lastDate,
    setCount: r.setCount,
  }));
}


let db: SQLite.SQLiteDatabase | null = null;

async function initDbNative() {
  db = SQLite.openDatabaseSync("workouts.db");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      started_at,
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
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN started_at TEXT;`);
  } catch {}
  try {
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN ended_at TEXT;`);
  } catch {}
  try {
    await db.execAsync(`ALTER TABLE workouts ADD COLUMN name TEXT;`)
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

export async function initDb() {
  return initDbNative();
}

export async function all<T = any>(sql: string, params: any[] = []) {
  return allNative<T>(sql, params);
}

export async function run(sql: string, params: any[] = []) {
  return runNative(sql, params);
}

export async function startWorkoutForDate(dateISO: string): Promise<void> {
  const startedAt = new Date().toISOString();
  await run(
    `INSERT INTO workouts (date, started_at) VALUES (?, ?)`,
    [dateISO, startedAt]
  )
}

export async function startWorkout(dateISO: string, name: string){
  const startedAt = new Date().toISOString();
  await run (
    `INSERT INTO workouts (date, name, started_at) VALUES (?, ?, ?)`,
    [dateISO, name, startedAt]
  )
}

export async function stopWorkoutForDate(dateISO: string) {
  const endedAt = new Date().toISOString();
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
  unit: string = "kg"
): Promise<void> {
  await run(
    `INSERT INTO sets (workout_id, exercise, reps, weight, unit) VALUES (?,?,?,?,?)`,
    [workoutId, exercise.trim(), Number(reps), weight != null ? Number(weight) : null, unit]
  );
}

export async function deleteSet(id: number): Promise<void> {
  await run(`DELETE FROM sets WHERE id=?`, [id]);
}

export async function deleteWorkout(id: number): Promise<void> {
  await run (`DELETE FROM workouts WHERE id=?`,[id]);
}

export async function editSet(
  setId: number,
  exercise: string,
  reps: number,
  weight: number | null,
  unit: string
): Promise<void> {
  await run(
    `UPDATE sets SET exercise=?, reps=?, weight=?, unit=? WHERE id=?`,
    [exercise, reps, weight, unit, setId]
  );
}
