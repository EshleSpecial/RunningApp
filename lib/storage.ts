import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, TrainingWeek, WorkoutLog, PTLog, WorkoutLogEntry, StreakMeta } from '../types';

const KEYS = {
  USER_PROFILE: 'user_profile',
  TRAINING_PLAN: 'training_plan',
  WORKOUT_LOG: 'workout_log',
  PT_LOG: 'pt_log',
  STREAK_META: 'streak_meta',
} as const;

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export async function saveTrainingPlan(plan: TrainingWeek[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRAINING_PLAN, JSON.stringify(plan));
}

export async function loadTrainingPlan(): Promise<TrainingWeek[] | null> {
  const raw = await AsyncStorage.getItem(KEYS.TRAINING_PLAN);
  return raw ? (JSON.parse(raw) as TrainingWeek[]) : null;
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  await AsyncStorage.setItem(KEYS.WORKOUT_LOG, JSON.stringify(log));
}

export async function loadWorkoutLog(): Promise<WorkoutLog> {
  const raw = await AsyncStorage.getItem(KEYS.WORKOUT_LOG);
  return raw ? (JSON.parse(raw) as WorkoutLog) : {};
}

export async function savePTLog(log: PTLog): Promise<void> {
  await AsyncStorage.setItem(KEYS.PT_LOG, JSON.stringify(log));
}

export async function loadPTLog(): Promise<PTLog> {
  const raw = await AsyncStorage.getItem(KEYS.PT_LOG);
  return raw ? (JSON.parse(raw) as PTLog) : {};
}

export async function loadStreakMeta(): Promise<StreakMeta> {
  const raw = await AsyncStorage.getItem(KEYS.STREAK_META);
  return raw ? (JSON.parse(raw) as StreakMeta) : { longestStreak: 0, totalWorkoutsCompleted: 0 };
}

export async function saveStreakMeta(meta: StreakMeta): Promise<void> {
  await AsyncStorage.setItem(KEYS.STREAK_META, JSON.stringify(meta));
}

/** Merges patch into the log entry for `date`, saves, and returns the updated log. */
export async function patchWorkoutLogEntry(
  date: string,
  patch: Partial<WorkoutLogEntry>
): Promise<WorkoutLog> {
  const log = await loadWorkoutLog();
  const updated: WorkoutLog = {
    ...log,
    [date]: { ...(log[date] ?? { completed: false }), ...patch },
  };
  await saveWorkoutLog(updated);
  return updated;
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
