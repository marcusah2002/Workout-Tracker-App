import raw from "./AllExercises.json"; // <— din fil

type RawExercise = {
  id: string;
  name: string;
  force?: string | null;
  level?: string | null;
  mechanic?: string | null;
  equipment?: string | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  instructions?: string[] | null;
  category?: string | null;
  images?: string[] | null;
};

export type Exercise = {
  id: string;
  name: string;
  force?: string;
  level?: string;
  mechanic?: string;
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category?: string;
  images: string[];
};

function clean(e: RawExercise): Exercise {
  return {
    id: e.id,
    name: e.name,
    force: e.force ?? undefined,
    level: e.level ?? undefined,
    mechanic: e.mechanic ?? undefined,
    equipment: e.equipment ?? undefined,
    primaryMuscles: e.primaryMuscles ?? [],
    secondaryMuscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    category: e.category ?? undefined,
    images: e.images ?? [],
  };
}

export const ALL_EXERCISES: Exercise[] = (raw as RawExercise[]).map(clean);
export const EXERCISE_NAMES: string[] = ALL_EXERCISES.map(e => e.name);
