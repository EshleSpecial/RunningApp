import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, TrainingWeek, WorkoutLog, PTLog } from '../types';

const KEYS = {
  USER_PROFILE: 'user_profile',
  TRAINING_PLAN: 'training_plan',
  WORKOUT_LOG: 'workout_log',
  PT_LOG: 'pt_log',
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

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
