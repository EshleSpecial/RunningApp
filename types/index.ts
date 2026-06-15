export type WorkoutType =
  | 'easy_run'
  | 'long_run'
  | 'cross_train'
  | 'pt_only'
  | 'rest'
  | 'race';

export type Phase = 1 | 2 | 3 | 4 | 5;

export interface UserProfile {
  name: string;
  currentWeeklyMiles: number;
  hipPainLevel: number; // 1–10
  wineAndDineDate: string; // ISO date 'yyyy-MM-dd'
  dopeyStartDate: string;  // ISO date 'yyyy-MM-dd'
  stravaAccessToken?: string;
  onboardingComplete: boolean;
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
