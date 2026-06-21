import type { WorkoutLog, TrainingWeek } from '../types';

export interface RacePrediction {
  name: string;
  miles: number;
  predictedTimeMin: number;
  formattedTime: string;
}

const RACE_DISTANCES = [
  { name: '5K',           miles: 3.107 },
  { name: '10K',          miles: 6.214 },
  { name: 'Half Marathon', miles: 13.1  },
  { name: 'Full Marathon', miles: 26.2  },
];

function riegelPredict(baseMiles: number, baseTimeMin: number, targetMiles: number): number {
  return baseTimeMin * Math.pow(targetMiles / baseMiles, 1.06);
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.round((minutes - Math.floor(minutes)) * 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface LoggedRun {
  miles: number;
  pace: number;
  isRace: boolean;
}

function collectLoggedRuns(log: WorkoutLog, plan: TrainingWeek[]): LoggedRun[] {
  const runs: LoggedRun[] = [];
  for (const week of plan) {
    for (const w of week.workouts) {
      const entry = log[w.date];
      if (entry?.actualPaceMinPerMile && entry.completed && w.distanceMiles && w.distanceMiles >= 3) {
        runs.push({
          miles: w.distanceMiles,
          pace: entry.actualPaceMinPerMile,
          isRace: w.type === 'race',
        });
      }
    }
  }
  return runs;
}

export interface PredictionResult {
  predictions: RacePrediction[];
  basedOnActual: boolean;
  basePace: number;
  baseMiles: number;
}

export function buildPredictions(
  easyPaceMinPerMile: number,
  log?: WorkoutLog,
  plan?: TrainingWeek[]
): PredictionResult {
  let baseMiles = 10;
  let basePace = easyPaceMinPerMile * 0.88;
  let basedOnActual = false;

  if (log && plan) {
    const runs = collectLoggedRuns(log, plan);
    const raceRuns = runs.filter(r => r.isRace).sort((a, b) => b.miles - a.miles);
    const trainRuns = runs.filter(r => !r.isRace).sort((a, b) => b.miles - a.miles);

    if (raceRuns.length > 0) {
      baseMiles = raceRuns[0].miles;
      basePace = raceRuns[0].pace;
      basedOnActual = true;
    } else if (trainRuns.length > 0) {
      baseMiles = trainRuns[0].miles;
      basePace = trainRuns[0].pace * 0.88;
      basedOnActual = true;
    }
  }

  const baseTimeMin = baseMiles * basePace;

  const predictions = RACE_DISTANCES.map(r => {
    const predictedTimeMin = riegelPredict(baseMiles, baseTimeMin, r.miles);
    return {
      name: r.name,
      miles: r.miles,
      predictedTimeMin,
      formattedTime: formatTime(predictedTimeMin),
    };
  });

  return { predictions, basedOnActual, basePace, baseMiles };
}

export function getRecentPaceLogs(
  log: WorkoutLog,
  plan: TrainingWeek[],
  limit = 5
): Array<{ date: string; miles: number; paceMinPerMile: number; workoutType: string }> {
  const entries: Array<{ date: string; miles: number; paceMinPerMile: number; workoutType: string }> = [];
  for (const week of plan) {
    for (const w of week.workouts) {
      const entry = log[w.date];
      if (entry?.actualPaceMinPerMile && entry.completed && w.distanceMiles) {
        entries.push({
          date: w.date,
          miles: w.distanceMiles,
          paceMinPerMile: entry.actualPaceMinPerMile,
          workoutType: w.type,
        });
      }
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
