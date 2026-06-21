export interface FuelingPlan {
  estimatedTimeMin: number;
  gelsNeeded: number;
  gelScheduleMin: number[];
  waterOzPerHour: number;
}

export interface TreadmillSettings {
  speedMph: string;
  inclinePct: number;
}

export function calculateFueling(
  distanceMiles: number,
  paceMinPerMile: number
): FuelingPlan | null {
  if (!distanceMiles || distanceMiles < 4) return null;
  const estimatedTimeMin = Math.round(distanceMiles * paceMinPerMile);
  if (estimatedTimeMin < 45) return null;

  const gelScheduleMin: number[] = [];
  let next = 45;
  while (next < estimatedTimeMin - 10) {
    gelScheduleMin.push(next);
    next += 35;
  }

  return {
    estimatedTimeMin,
    gelsNeeded: gelScheduleMin.length,
    gelScheduleMin,
    waterOzPerHour: 16,
  };
}

export function getTreadmillSettings(
  workoutType: string,
  easyPaceMinPerMile: number
): TreadmillSettings {
  let factor: number;
  let inclinePct: number;

  switch (workoutType) {
    case 'long_run':
      factor = 1.2;
      inclinePct = 1.0;
      break;
    case 'easy_run':
      factor = 1.1;
      inclinePct = 1.0;
      break;
    case 'cross_train':
      factor = 1.15;
      inclinePct = 0.5;
      break;
    default:
      factor = 1.0;
      inclinePct = 1.0;
  }

  const speedMph = (60 / (easyPaceMinPerMile * factor)).toFixed(1);
  return { speedMph, inclinePct };
}

export function formatPace(paceMinPerMile: number): string {
  const mins = Math.floor(paceMinPerMile);
  const secs = Math.round((paceMinPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/mi`;
}
