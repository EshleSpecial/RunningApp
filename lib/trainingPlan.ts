import { addDays, addWeeks, differenceInWeeks, format, parseISO } from 'date-fns';
import type { CourseDifficulty, Phase, Race, TrainingWeek, UserProfile, Workout, WorkoutType } from '../types';

function hillNote(difficulty: CourseDifficulty): string {
  if (difficulty === 'hilly') {
    return ' Hill training: after 1 mi warm-up, run 6 repeats of 45 sec hard uphill with easy jog-down recovery. Finish with 1 mi easy. These replicate your race terrain.';
  }
  if (difficulty === 'very_hilly') {
    return ' Race-specific hill workout: after 1 mi warm-up, run 8–10 repeats of 60 sec hard uphill with easy jog-down recovery. Building specific strength for your hilly course.';
  }
  return '';
}

function runPriority(w: Workout): number {
  if (w.type === 'long_run' || w.type === 'race') return 0;
  if (w.type === 'cross_train') return 1;
  if (w.type === 'easy_run') {
    const magnitude = w.distanceMiles ?? (w.durationMins ?? 0) / 10;
    return magnitude >= 3 ? 2 : 3;
  }
  return 4;
}

function adjustToTrainingDays(workouts: Workout[], targetDays: number): Workout[] {
  const active = workouts.filter(
    w => w.type !== 'rest' && w.type !== 'pt_only'
  );
  if (active.length <= targetDays) return workouts;

  const sorted = [...active].sort((a, b) => runPriority(a) - runPriority(b));
  const keep = new Set(sorted.slice(0, targetDays).map(w => w.date));

  return workouts.map(w => {
    if (w.type === 'rest' || w.type === 'pt_only') return w;
    if (keep.has(w.date)) return w;
    return {
      ...w,
      type: 'rest' as WorkoutType,
      distanceMiles: undefined,
      durationMins: undefined,
      notes: 'Rest day. Light stretching and stay hydrated.',
    };
  });
}

function toISO(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function day(weekStart: Date, offset: number): Date {
  return addDays(weekStart, offset);
}

function workout(
  weekStart: Date,
  offset: number,
  type: WorkoutType,
  opts: { distanceMiles?: number; durationMins?: number; notes: string }
): Workout {
  const date = day(weekStart, offset);
  return { id: `${toISO(date)}_${type}`, date: toISO(date), type, ...opts };
}

function isSameWeek(weekStart: Date, target: Date): boolean {
  const weekEnd = addDays(weekStart, 6);
  return target >= weekStart && target <= weekEnd;
}

function getDynamicPhase(
  week: number,
  totalWeeks: number,
  weekStart: Date,
  races: Race[]
): { phase: Phase; phaseName: string; isTaper: boolean } {
  const nextRace = races.find(r => parseISO(r.date) >= weekStart);

  if (!nextRace) {
    if (week <= Math.floor(totalWeeks * 0.25))
      return { phase: 1, phaseName: 'Foundation', isTaper: false };
    if (week <= Math.floor(totalWeeks * 0.6))
      return { phase: 2, phaseName: 'Base Build', isTaper: false };
    return { phase: 3, phaseName: 'Maintenance', isTaper: false };
  }

  const weeksToRace = differenceInWeeks(parseISO(nextRace.date), weekStart);
  const raceName = nextRace.name;

  if (weeksToRace <= 1)
    return { phase: 3, phaseName: `${raceName} Race Week`, isTaper: true };
  if (weeksToRace <= 3)
    return { phase: 3, phaseName: `${raceName} Taper`, isTaper: true };
  if (weeksToRace <= 8)
    return { phase: 3, phaseName: `${raceName} Prep`, isTaper: false };
  if (week <= Math.floor(totalWeeks * 0.25))
    return { phase: 1, phaseName: 'Foundation', isTaper: false };
  return { phase: 2, phaseName: 'Base Build', isTaper: false };
}

function buildRaceWeek(ws: Date, race: Race): Workout[] {
  const is5K = race.distanceMiles < 6.0;
  const isMultiDay = race.distanceMiles >= 26.2;

  const raceDate = parseISO(race.date);
  const diff = Math.round(
    (raceDate.getTime() - ws.getTime()) / (1000 * 60 * 60 * 24)
  );
  const offset = Math.min(Math.max(diff, 0), 6);

  const baseWorkouts: Workout[] = [
    workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Easy shakeout. Keep it relaxed — save your legs for race day.' }),
    workout(ws, 1, 'pt_only', { notes: 'Light strength and mobility session only. No hard efforts this week.' }),
    workout(ws, 2, 'easy_run', { distanceMiles: is5K ? 1.5 : 2, notes: 'Short easy run with a few 30-second pickups at race pace to stay sharp.' }),
    workout(ws, 3, 'rest', { notes: 'Rest. Check your gear, study the course map, prepare your race morning routine.' }),
    workout(ws, 4, 'rest', { notes: 'Full rest. Stay off your feet. Eat well, hydrate, sleep early.' }),
    workout(ws, offset, 'race', {
      distanceMiles: race.distanceMiles,
      notes: `Race day: ${race.name} (${race.distanceMiles} miles). Start conservatively, run your own race. You trained for this.`,
    }),
    workout(ws, 6, 'rest', { notes: 'Post-race rest. Celebrate what you accomplished. Light walking only.' }),
  ];

  if (isMultiDay) {
    baseWorkouts[4] = workout(ws, 4, 'easy_run', {
      distanceMiles: 2,
      notes: 'Very short shakeout. Marathon eve — keep it to 10-15 minutes, just to stay loose.',
    });
  }

  return baseWorkouts;
}

export function generateTrainingPlan(profile: UserProfile): TrainingWeek[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const planStart = addDays(today, daysUntilMonday);

  const sortedRaces = [...(profile.races ?? [])].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
  );

  let totalWeeks: number;
  if (profile.goalType === 'general_training') {
    totalWeeks = 12;
  } else if (profile.goalType === 'no_date_plan') {
    totalWeeks = profile.planWeeks ?? 14;
  } else if (sortedRaces.length > 0) {
    const lastRace = sortedRaces[sortedRaces.length - 1];
    totalWeeks = differenceInWeeks(parseISO(lastRace.date), planStart) + 1;
  } else {
    totalWeeks = 14;
  }

  let longRunMiles = Math.max((profile.currentWeeklyMiles || 0) * 0.4, 1.5);
  const weeks: TrainingWeek[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStart = addWeeks(planStart, w - 1);
    const weekStartDate = toISO(weekStart);

    const raceThisWeek = sortedRaces.find(r =>
      isSameWeek(weekStart, parseISO(r.date))
    );

    const { phase, phaseName, isTaper } = getDynamicPhase(
      w, totalWeeks, weekStart, sortedRaces
    );

    const cutback = w % 4 === 0;
    const mult = cutback || isTaper ? 0.75 : 1.0;
    const difficulty: CourseDifficulty = profile.raceCourseDifficulty ??
      raceThisWeek?.terrain ?? 'flat';

    let workouts: Workout[];
    if (raceThisWeek) {
      workouts = buildRaceWeek(weekStart, raceThisWeek);
    } else if (isTaper) {
      workouts = buildTaperWeek(weekStart, phase, longRunMiles * mult);
    } else {
      workouts = buildRegularWeek(weekStart, phase, longRunMiles * mult, difficulty);
    }

    const targetDays = profile.trainingDaysPerWeek ?? 5;
    if (targetDays < 6 && !raceThisWeek) {
      workouts = adjustToTrainingDays(workouts, targetDays);
    }

    weeks.push({
      weekNumber: w,
      startDate: weekStartDate,
      phase,
      phaseName,
      isTaper,
      workouts,
    });

    if (!cutback && !isTaper && !raceThisWeek) {
      if (phase === 1) longRunMiles = Math.min(longRunMiles * 1.1, 4);
      else if (phase === 2) longRunMiles = Math.min(longRunMiles * 1.1, 10);
      else if (phase === 3) longRunMiles = Math.min(longRunMiles * 1.08, 14);
      else if (phase === 4) longRunMiles = Math.min(longRunMiles * 0.95, 8);
      else if (phase === 5) longRunMiles = Math.min(longRunMiles * 1.1, 20);
    }
  }

  return weeks;
}

// Offsets: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun

function buildRegularWeek(ws: Date, phase: Phase, longRun: number, difficulty: CourseDifficulty = 'flat'): Workout[] {
  const lr = parseFloat(longRun.toFixed(1));

  if (phase === 1) {
    return [
      workout(ws, 0, 'easy_run', { durationMins: 25, notes: 'Walk/run intervals: 2 min run, 1 min walk. Keep effort conversational. Aim for 170–180 spm cadence to reduce hip abductor load.' }),
      workout(ws, 1, 'pt_only', { notes: 'Full strength & mobility session — all 8 gluteus minimus exercises.' }),
      workout(ws, 2, 'easy_run', { durationMins: 25, notes: 'Walk/run intervals. Focus on even footfall — no limping pattern.' }),
      workout(ws, 3, 'rest', { notes: 'Rest. Foam roll hips, glutes, and IT band.' }),
      workout(ws, 4, 'cross_train', { durationMins: 30, notes: 'Low-impact cross-training: cycling, elliptical, or pool running. Easy effort.' }),
      workout(ws, 5, 'easy_run', { durationMins: 35, notes: 'Longer easy session. End with strength & mobility exercises (clamshells + glute bridge). 170–180 spm.' }),
      workout(ws, 6, 'rest', { notes: 'Full rest day. Hydrate and sleep.' }),
    ];
  }

  if (phase === 2) {
    const wed2Notes = 'Easy run. If hips feel tight, take walk breaks.' + hillNote(difficulty);
    return [
      workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Easy run. Conversational pace throughout. 170–180 spm.' }),
      workout(ws, 1, 'pt_only', { notes: 'Full strength & mobility session.' }),
      workout(ws, 2, 'easy_run', { distanceMiles: 3.5, notes: wed2Notes }),
      workout(ws, 3, 'cross_train', { durationMins: 35, notes: 'Active recovery — bike, swim, or elliptical at easy effort.' }),
      workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Easy run. End with stability exercises.' }),
      workout(ws, 5, 'long_run', { distanceMiles: lr, notes: `Long run at easy conversational pace. Time on feet matters more than pace. Walk breaks are encouraged. 170–180 spm.` }),
      workout(ws, 6, 'rest', { notes: 'Rest and recover. Hydrate well.' }),
    ];
  }

  if (phase === 3) {
    const wed3Notes = 'Include 2 miles at 10K goal pace in the middle. Hip check at halfway.' + hillNote(difficulty);
    return [
      workout(ws, 0, 'easy_run', { distanceMiles: 4, notes: 'Easy run. Steady effort, keep it comfortable.' }),
      workout(ws, 1, 'pt_only', { notes: 'Strength & mobility session + hip flexor stretching.' }),
      workout(ws, 2, 'easy_run', { distanceMiles: 5, notes: wed3Notes }),
      workout(ws, 3, 'rest', { notes: 'Rest before long run weekend.' }),
      workout(ws, 4, 'easy_run', { distanceMiles: 4, notes: 'Easy shakeout. Legs fresh for tomorrow\'s long run.' }),
      workout(ws, 5, 'long_run', { distanceMiles: lr, notes: `Long run. This is your most important workout. Easy effort — you should be able to hold a conversation. Walk the uphills.` }),
      workout(ws, 6, 'rest', { notes: 'Recovery day. Light hip stability work.' }),
    ];
  }

  if (phase === 4) {
    return [
      workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Post-race recovery run. Very easy — just movement to flush the legs.' }),
      workout(ws, 1, 'pt_only', { notes: 'Full strength & mobility session. Good time to check back in after your race.' }),
      workout(ws, 2, 'cross_train', { durationMins: 30, notes: 'Easy cross-training. Your body is still recovering.' }),
      workout(ws, 3, 'rest', { notes: 'Rest.' }),
      workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Easy run. Note how you feel post-race.' }),
      workout(ws, 5, 'long_run', { distanceMiles: lr, notes: 'Rebuilding long run. Keep it easy and enjoy it.' }),
      workout(ws, 6, 'rest', { notes: 'Rest.' }),
    ];
  }

  // Phase 5: back-to-back long runs on Sat+Sun
  const satRun = parseFloat((lr * 0.55).toFixed(1));
  const sunRun = parseFloat(Math.min(lr, 20).toFixed(1));
  return [
    workout(ws, 0, 'easy_run', { distanceMiles: 5, notes: 'Easy run. Never push hard in training during this phase.' }),
    workout(ws, 1, 'pt_only', { notes: 'Strength & mobility session. Hip maintenance is critical this phase.' }),
    workout(ws, 2, 'easy_run', { distanceMiles: 6, notes: 'Medium run. Include a few miles near half marathon effort.' }),
    workout(ws, 3, 'rest', { notes: 'Rest before back-to-back weekend. Eat well and sleep.' }),
    workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Short shakeout. Keep it very easy.' }),
    workout(ws, 5, 'long_run', { distanceMiles: satRun, notes: `Saturday long run — simulate back-to-back race effort. Stay easy: ${satRun} miles.` }),
    workout(ws, 6, 'long_run', { distanceMiles: sunRun, notes: `Sunday long run on tired legs — key workout. Go easy! ${sunRun} miles.` }),
  ];
}

function buildTaperWeek(ws: Date, phase: Phase, longRun: number): Workout[] {
  const lr = parseFloat(longRun.toFixed(1));
  return [
    workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Easy taper run. Keep it short and comfortable.' }),
    workout(ws, 1, 'pt_only', { notes: 'Strength & mobility session. Maintain hip strength during taper.' }),
    workout(ws, 2, 'easy_run', { distanceMiles: 4, notes: 'Easy run. A few strides at race pace to stay sharp.' }),
    workout(ws, 3, 'rest', { notes: 'Rest. Trust your training.' }),
    workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Easy shakeout. Legs should feel fresh.' }),
    workout(ws, 5, 'long_run', { distanceMiles: lr, notes: `Reduced long run during taper: ${lr} miles. Easy effort only.` }),
    workout(ws, 6, 'rest', { notes: 'Rest. Hydrate and prepare gear.' }),
  ];
}
