import AsyncStorage from '@react-native-async-storage/async-storage';
import { subDays } from 'date-fns';
import type { TrainingWeek } from '../types';
import { loadWorkoutLog, saveWorkoutLog } from './storage';

// ─── Strava API credentials ───────────────────────────────────────────────────
// 1. Go to https://www.strava.com/settings/api and create an app
// 2. Set "Authorization Callback Domain" to "localhost"
// 3. Paste your Client ID and Client Secret below
export const STRAVA_CLIENT_ID = '260849';
export const STRAVA_CLIENT_SECRET = '686aa50760560bf4d0bd16c65f9bd332917af7d7';
// ─────────────────────────────────────────────────────────────────────────────

const TOKENS_KEY = 'strava_tokens_v1';

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  athleteId: number;
  athleteName: string;
}

export async function loadStravaTokens(): Promise<StravaTokens | null> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  return raw ? (JSON.parse(raw) as StravaTokens) : null;
}

export async function saveStravaTokens(tokens: StravaTokens): Promise<void> {
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export async function clearStravaTokens(): Promise<void> {
  await AsyncStorage.removeItem(TOKENS_KEY);
}

async function refreshToken(refreshTok: string): Promise<StravaTokens | null> {
  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshTok,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const existing = await loadStravaTokens();
    const updated: StravaTokens = {
      ...(existing ?? ({} as StravaTokens)),
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
    await saveStravaTokens(updated);
    return updated;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadStravaTokens();
  if (!tokens) return null;
  if (Date.now() / 1000 < tokens.expiresAt - 120) return tokens.accessToken;
  const refreshed = await refreshToken(tokens.refreshToken);
  return refreshed?.accessToken ?? null;
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokens | null> {
  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tokens: StravaTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete?.id ?? 0,
      athleteName: `${data.athlete?.firstname ?? ''} ${data.athlete?.lastname ?? ''}`.trim(),
    };
    await saveStravaTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

export interface StravaRun {
  id: number;
  name: string;
  start_date_local: string; // ISO string, e.g. "2025-01-15T07:30:00Z"
  distance: number; // meters
  moving_time: number; // seconds
  average_speed: number; // m/s
  total_elevation_gain: number;
  average_heartrate?: number;
  sport_type: string;
}

export async function fetchRecentRuns(daysBack = 90): Promise<StravaRun[]> {
  const token = await getValidAccessToken();
  if (!token) throw new Error('Not connected to Strava');
  const after = Math.floor(subDays(new Date(), daysBack).getTime() / 1000);
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch Strava activities');
  const activities: StravaRun[] = await res.json();
  return activities.filter(a =>
    a.sport_type === 'Run' || a.sport_type === 'TrailRun' || a.sport_type === 'VirtualRun'
  );
}

export interface SyncResult {
  matched: number;
  imported: number;
}

export async function syncStravaActivities(plan: TrainingWeek[]): Promise<SyncResult> {
  const runs = await fetchRecentRuns(90);

  // Build a map of date → longest run that day
  const byDate = new Map<string, StravaRun>();
  for (const run of runs) {
    const date = run.start_date_local.slice(0, 10);
    const existing = byDate.get(date);
    if (!existing || run.distance > existing.distance) byDate.set(date, run);
  }

  const log = await loadWorkoutLog();
  let matched = 0;
  let imported = 0;

  for (const week of plan) {
    for (const workout of week.workouts) {
      const run = byDate.get(workout.date);
      if (!run) continue;
      matched++;
      if (log[workout.date]?.completed) continue; // don't overwrite manual entries
      imported++;
      const distMiles = run.distance * 0.000621371;
      const paceMinPerMile = distMiles > 0 ? run.moving_time / 60 / distMiles : 0;
      log[workout.date] = {
        ...(log[workout.date] ?? { completed: false }),
        completed: true,
        actualPaceMinPerMile: Math.round(paceMinPerMile * 10) / 10,
        userNotes: log[workout.date]?.userNotes ?? `Auto-imported from Strava: ${run.name}`,
      };
    }
  }

  await saveWorkoutLog(log);
  return { matched, imported };
}
