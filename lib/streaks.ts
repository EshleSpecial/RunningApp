import { format, subDays } from 'date-fns';
import type { WorkoutLog, TrainingWeek } from '../types';

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  required: number;
}

export const MILESTONE_BADGES: Badge[] = [
  { id: 'streak_3',  label: '3 Days',   emoji: '🔥', required: 3  },
  { id: 'streak_7',  label: 'One Week', emoji: '⚡', required: 7  },
  { id: 'streak_14', label: '2 Weeks',  emoji: '💪', required: 14 },
  { id: 'streak_30', label: '30 Days',  emoji: '💎', required: 30 },
  { id: 'streak_60', label: '60 Days',  emoji: '🌟', required: 60 },
  { id: 'streak_90', label: '90 Days',  emoji: '🏆', required: 90 },
];

const ACTIVE_TYPES = new Set(['easy_run', 'long_run', 'cross_train', 'race']);

/**
 * Computes current streak by walking backwards from today.
 * Rest days and PT-only days in the plan are neutral (do not break streak).
 * If today's workout isn't yet done, the count starts from yesterday.
 */
export function computeStreak(log: WorkoutLog, plan: TrainingWeek[]): number {
  const today = format(new Date(), 'yyyy-MM-dd');

  const activePlanDates = new Set<string>();
  for (const week of plan) {
    for (const w of week.workouts) {
      if (ACTIVE_TYPES.has(w.type)) activePlanDates.add(w.date);
    }
  }

  const todayDone = activePlanDates.has(today) && (log[today]?.completed ?? false);
  const startDate = todayDone ? new Date() : subDays(new Date(), 1);

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = format(subDays(startDate, i), 'yyyy-MM-dd');

    if (activePlanDates.has(dateStr)) {
      if (log[dateStr]?.completed) {
        streak++;
      } else {
        break;
      }
    }
    // rest/PT/non-plan dates are neutral — keep walking back
  }

  return streak;
}

/** Returns badges the user has earned based on current or lifetime-best streak. */
export function getEarnedBadges(currentStreak: number, longestStreak: number): Badge[] {
  const best = Math.max(currentStreak, longestStreak);
  return MILESTONE_BADGES.filter(b => best >= b.required);
}

/** Returns count of total completed non-rest workouts across all log entries and the plan. */
export function countTotalCompleted(log: WorkoutLog, plan: TrainingWeek[]): number {
  let count = 0;
  for (const week of plan) {
    for (const w of week.workouts) {
      if (ACTIVE_TYPES.has(w.type) && log[w.date]?.completed) count++;
    }
  }
  return count;
}
