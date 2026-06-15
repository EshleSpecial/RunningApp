import { addDays, addWeeks, differenceInWeeks, format, parseISO } from 'date-fns';
import type { Phase, TrainingWeek, UserProfile, Workout, WorkoutType } from '../types';

const PLAN_START = new Date(2026, 5, 15); // June 15, 2026 (Monday)

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

function getPhase(week: number): { phase: Phase; phaseName: string; isTaper: boolean } {
  if (week <= 5) return { phase: 1, phaseName: 'Foundation', isTaper: false };
  if (week <= 12) return { phase: 2, phaseName: 'Base Build', isTaper: false };
  if (week <= 17) return { phase: 3, phaseName: 'Wine & Dine Prep', isTaper: false };
  if (week <= 19) return { phase: 3, phaseName: 'Wine & Dine Taper', isTaper: true };
  if (week <= 25) return { phase: 4, phaseName: 'Recovery & Rebuild', isTaper: false };
  if (week <= 28) return { phase: 5, phaseName: 'Dopey Prep', isTaper: false };
  if (week === 29) return { phase: 5, phaseName: 'Dopey Taper', isTaper: true };
  return { phase: 5, phaseName: 'Race Week', isTaper: false };
}

function isCutback(week: number): boolean {
  return week % 4 === 0;
}

export function generateTrainingPlan(profile: UserProfile): TrainingWeek[] {
  const wineAndDine = parseISO(profile.wineAndDineDate); // Oct 31, 2026 (Sat)
  const dopeyStart = parseISO(profile.dopeyStartDate);   // Jan 7, 2027 (Thu)

  const totalWeeks = differenceInWeeks(addDays(dopeyStart, 3), PLAN_START) + 1;
  const weeks: TrainingWeek[] = [];

  // long run starts at 40% of current weekly miles, minimum 1.5
  let longRunMiles = Math.max((profile.currentWeeklyMiles || 0) * 0.4, 1.5);

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStart = addWeeks(PLAN_START, w - 1);
    const { phase, phaseName, isTaper } = getPhase(w);
    const cutback = isCutback(w);
    const mult = cutback || isTaper ? 0.75 : 1.0;

    const isWineWeek = isSameWeek(weekStart, wineAndDine);
    const isDopeyWeek = isSameWeek(weekStart, dopeyStart);

    let workouts: Workout[];

    if (isWineWeek) {
      workouts = buildWineAndDineRaceWeek(weekStart, wineAndDine);
    } else if (isDopeyWeek) {
      workouts = buildDopeyRaceWeek(weekStart, dopeyStart);
    } else if (isTaper) {
      workouts = buildTaperWeek(weekStart, phase, longRunMiles * mult);
    } else {
      workouts = buildRegularWeek(weekStart, phase, longRunMiles * mult);
    }

    weeks.push({ weekNumber: w, startDate: toISO(weekStart), phase, phaseName, isTaper, workouts });

    // Advance long run distance each non-cutback, non-taper, non-race week
    if (!cutback && !isTaper && !isWineWeek && !isDopeyWeek) {
      if (phase === 1) longRunMiles = Math.min(longRunMiles * 1.1, 4);
      else if (phase === 2) longRunMiles = Math.min(longRunMiles * 1.1, 10);
      else if (phase === 3) longRunMiles = Math.min(longRunMiles * 1.08, 14);
      else if (phase === 4) longRunMiles = Math.min(longRunMiles * 0.95, 8); // recover then rebuild
      else if (phase === 5) longRunMiles = Math.min(longRunMiles * 1.1, 20);
    }
  }

  return weeks;
}

// Offsets: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun

function buildRegularWeek(ws: Date, phase: Phase, longRun: number): Workout[] {
  const lr = parseFloat(longRun.toFixed(1));

  if (phase === 1) {
    return [
      workout(ws, 0, 'easy_run', { durationMins: 25, notes: 'Walk/run intervals: 2 min run, 1 min walk. Keep effort conversational. Aim for 170–180 spm cadence to reduce hip abductor load.' }),
      workout(ws, 1, 'pt_only', { notes: 'Full PT session — all 8 gluteus minimus exercises.' }),
      workout(ws, 2, 'easy_run', { durationMins: 25, notes: 'Walk/run intervals. Focus on even footfall — no limping pattern.' }),
      workout(ws, 3, 'rest', { notes: 'Rest. Foam roll hips, glutes, and IT band.' }),
      workout(ws, 4, 'cross_train', { durationMins: 30, notes: 'Low-impact cross-training: cycling, elliptical, or pool running. Easy effort.' }),
      workout(ws, 5, 'easy_run', { durationMins: 35, notes: 'Longer easy session. End with PT exercises (clamshells + glute bridge). 170–180 spm.' }),
      workout(ws, 6, 'rest', { notes: 'Full rest day. Hydrate and sleep.' }),
    ];
  }

  if (phase === 2) {
    return [
      workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Easy run. Conversational pace throughout. 170–180 spm.' }),
      workout(ws, 1, 'pt_only', { notes: 'Full PT session.' }),
      workout(ws, 2, 'easy_run', { distanceMiles: 3.5, notes: 'Easy run. If hips feel tight, take walk breaks.' }),
      workout(ws, 3, 'cross_train', { durationMins: 35, notes: 'Active recovery — bike, swim, or elliptical at easy effort.' }),
      workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Easy run. End with PT stability exercises.' }),
      workout(ws, 5, 'long_run', { distanceMiles: lr, notes: `Long run at easy conversational pace. Time on feet matters more than pace. Walk breaks are encouraged. 170–180 spm.` }),
      workout(ws, 6, 'rest', { notes: 'Rest and recover. Hydrate well.' }),
    ];
  }

  if (phase === 3) {
    return [
      workout(ws, 0, 'easy_run', { distanceMiles: 4, notes: 'Easy run. Steady effort, keep it comfortable.' }),
      workout(ws, 1, 'pt_only', { notes: 'PT exercises + hip flexor stretching.' }),
      workout(ws, 2, 'easy_run', { distanceMiles: 5, notes: 'Include 2 miles at 10K goal pace in the middle. Hip check at halfway.' }),
      workout(ws, 3, 'rest', { notes: 'Rest before long run weekend.' }),
      workout(ws, 4, 'easy_run', { distanceMiles: 4, notes: 'Easy shakeout. Legs fresh for tomorrow\'s long run.' }),
      workout(ws, 5, 'long_run', { distanceMiles: lr, notes: `Long run. This is your most important workout. Easy effort — you should be able to hold a conversation. Walk the uphills.` }),
      workout(ws, 6, 'rest', { notes: 'Recovery day. Light PT hip stability work.' }),
    ];
  }

  if (phase === 4) {
    return [
      workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Post-race recovery run. Very easy — just movement to flush the legs.' }),
      workout(ws, 1, 'pt_only', { notes: 'Full PT session. Good time to check back in with your PT after Wine & Dine.' }),
      workout(ws, 2, 'cross_train', { durationMins: 30, notes: 'Easy cross-training. Your body is still recovering from Wine & Dine.' }),
      workout(ws, 3, 'rest', { notes: 'Rest.' }),
      workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Easy run. Note how hips feel post-race.' }),
      workout(ws, 5, 'long_run', { distanceMiles: lr, notes: 'Rebuilding long run. Keep it easy and enjoy it.' }),
      workout(ws, 6, 'rest', { notes: 'Rest.' }),
    ];
  }

  // Phase 5: Dopey Prep — back-to-back long runs on Sat+Sun to simulate Dopey
  const satRun = parseFloat((lr * 0.55).toFixed(1));
  const sunRun = parseFloat(Math.min(lr, 20).toFixed(1));
  return [
    workout(ws, 0, 'easy_run', { distanceMiles: 5, notes: 'Easy run. Dopey is about accumulation — never push hard in training.' }),
    workout(ws, 1, 'pt_only', { notes: 'PT session. Hip maintenance is critical this phase.' }),
    workout(ws, 2, 'easy_run', { distanceMiles: 6, notes: 'Medium run. Include a few miles near half marathon effort.' }),
    workout(ws, 3, 'rest', { notes: 'Rest before back-to-back weekend. Eat well and sleep.' }),
    workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Short shakeout. Keep it very easy.' }),
    workout(ws, 5, 'long_run', { distanceMiles: satRun, notes: `Saturday long run — simulate Dopey Day 3 (Half effort). Stay easy: ${satRun} miles.` }),
    workout(ws, 6, 'long_run', { distanceMiles: sunRun, notes: `Sunday long run on tired legs — Dopey simulation. This is the KEY workout. Go easy! ${sunRun} miles.` }),
  ];
}

function buildTaperWeek(ws: Date, phase: Phase, longRun: number): Workout[] {
  const lr = parseFloat(longRun.toFixed(1));
  return [
    workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Easy taper run. Keep it short and comfortable.' }),
    workout(ws, 1, 'pt_only', { notes: 'PT exercises. Maintain hip strength during taper.' }),
    workout(ws, 2, 'easy_run', { distanceMiles: 4, notes: 'Easy run. A few strides at race pace to stay sharp.' }),
    workout(ws, 3, 'rest', { notes: 'Rest. Trust your training.' }),
    workout(ws, 4, 'easy_run', { distanceMiles: 3, notes: 'Easy shakeout. Legs should feel fresh.' }),
    workout(ws, 5, 'long_run', { distanceMiles: lr, notes: `Reduced long run during taper: ${lr} miles. Easy effort only.` }),
    workout(ws, 6, 'rest', { notes: 'Rest. Hydrate and prepare gear.' }),
  ];
}

function buildWineAndDineRaceWeek(ws: Date, wineAndDine: Date): Workout[] {
  // Sat = Wine & Dine 10K, Sun = Half Marathon
  return [
    workout(ws, 0, 'easy_run', { distanceMiles: 3, notes: 'Easy shakeout. Keep it relaxed — legs for race weekend!' }),
    workout(ws, 1, 'pt_only', { notes: 'Light PT activation only. No heavy lifting this week.' }),
    workout(ws, 2, 'easy_run', { distanceMiles: 2, notes: 'Short easy run with a few 30-second pickups at race pace.' }),
    workout(ws, 3, 'rest', { notes: 'Rest. Carb-load begins. Check gear, pin on your bib.' }),
    workout(ws, 4, 'rest', { notes: 'Full rest. Stay off your feet as much as possible. Early bedtime.' }),
    workout(ws, 5, 'race', { distanceMiles: 6.2, notes: '🏅 Wine & Dine 10K! Start conservatively — the half is tomorrow. Hip check every 2 miles.' }),
    workout(ws, 6, 'race', { distanceMiles: 13.1, notes: '🏅 Wine & Dine Half Marathon! You trained for this. Run your race. Walk breaks are a strategy, not a failure.' }),
  ];
}

function buildDopeyRaceWeek(ws: Date, dopeyStart: Date): Workout[] {
  // dopeyStart = Thursday (offset 3 from Monday)
  return [
    workout(ws, 0, 'rest', { notes: 'Rest. Prepare your gear for 4 big days ahead.' }),
    workout(ws, 1, 'rest', { notes: 'Rest. Light stretching only. Early bedtime.' }),
    workout(ws, 2, 'rest', { notes: 'Rest. Carb-load. Set multiple alarms — races start before dawn.' }),
    workout(ws, 3, 'race', { distanceMiles: 3.1, notes: '🏅 Dopey Day 1: 5K! Treat this like a fun warm-up. Smile — there are 3 more races to come.' }),
    workout(ws, 4, 'race', { distanceMiles: 6.2, notes: '🏅 Dopey Day 2: 10K! Easy conversational effort. Full marathon is in 2 days.' }),
    workout(ws, 5, 'race', { distanceMiles: 13.1, notes: '🏅 Dopey Day 3: Half Marathon! Stick to your plan. Hip check every 3 miles.' }),
    workout(ws, 6, 'race', { distanceMiles: 26.2, notes: '🏅 Dopey Day 4: Full Marathon! You did it. Celebrate every mile. Walk the water stops. You are a Dopey Challenger!' }),
  ];
}
