export type WorkoutType =
  | 'easy_run'
  | 'long_run'
  | 'cross_train'
  | 'pt_only'
  | 'rest'
  | 'race';

export type Phase = 1 | 2 | 3 | 4 | 5;

export type CourseDifficulty = 'flat' | 'rolling' | 'hilly' | 'very_hilly';

export interface UserProfile {
  name: string;
  currentWeeklyMiles: number;
  hipPainLevel: number;
  wineAndDineDate: string;
  dopeyStartDate: string;
  stravaAccessToken?: string;
  onboardingComplete: boolean;
  trainingDaysPerWeek: number;
  prefersTreadmill: boolean;
  currentPaceMinPerMile: number;
  raceCourseDifficulty: CourseDifficulty;
}

export interface StreakMeta {
  longestStreak: number;
  totalWorkoutsCompleted: number;
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  distanceMiles?: number;
  durationMins?: number;
  notes: string;
}

export interface TrainingWeek {
  weekNumber: number;
  startDate: string;
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

export type PTLog = Record<string, string[]>;
