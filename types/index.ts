export type WorkoutType =
  | 'easy_run'
  | 'long_run'
  | 'cross_train'
  | 'pt_only'
  | 'rest'
  | 'race';

export type Phase = 1 | 2 | 3 | 4 | 5;

export type CourseDifficulty = 'flat' | 'rolling' | 'hilly' | 'very_hilly';

export interface Race {
  id: string;
  name: string;
  date: string; // ISO date 'yyyy-MM-dd'
  distanceMiles: number;
  terrain?: CourseDifficulty;
  elevationFt?: number;
}

export interface UserProfile {
  name: string;
  currentWeeklyMiles: number;
  feelingLevel: number; // 1–10
  races: Race[];
  goalType: 'multi_race' | 'single_race' | 'no_date_plan' | 'general_training';
  injury?: { type: string; description?: string };
  stravaAccessToken?: string;
  onboardingComplete: boolean;
  // Phase 2
  trainingDaysPerWeek: number;   // 3–6, how many active days per week
  prefersTreadmill: boolean;     // treadmill vs outdoor
  currentPaceMinPerMile: number; // easy pace, e.g. 12.0 = 12:00/mi
  // Phase 3
  raceCourseDifficulty: CourseDifficulty;
}

export interface StreakMeta {
  longestStreak: number;
  totalWorkoutsCompleted: number;
}

export interface Workout {
  id: string;
  date: string; // 'yyyy-MM-dd'
  type: WorkoutType;
  distanceMiles?: number;
  durationMins?: number;
  notes: string;
}

export interface TrainingWeek {
  weekNumber: number;
  startDate: string; // 'yyyy-MM-dd'
  phase: Phase;
  phaseName: string;
  isTaper: boolean;
  workouts: Workout[];
}

export interface WorkoutLogEntry {
  completed: boolean;
  swappedToCrossTraining?: boolean;
  painLevelAtTime?: number;
  userNotes?: string;
  // Phase 3
  actualPaceMinPerMile?: number;
  gelsConsumed?: number;
}

export type WorkoutLog = Record<string, WorkoutLogEntry>;

export interface PTExercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  duration?: string;
  description: string;
  tip: string;
}

export type PTLog = Record<string, string[]>; // date → completed exercise ids
