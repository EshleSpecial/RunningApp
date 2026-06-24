import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { addMinutes, parseISO } from 'date-fns';
import type { TrainingWeek } from '../types';

const WORKOUT_LABELS: Record<string, string> = {
  easy_run: 'Easy Run',
  long_run: 'Long Run',
  cross_train: 'Cross Training',
  pt_only: 'PT Exercises',
  rest: 'Rest Day',
  race: 'Race Day',
};

const WORKOUT_DURATION_MINS: Record<string, number> = {
  easy_run: 45,
  long_run: 120,
  cross_train: 45,
  pt_only: 30,
  rest: 0,
  race: 240,
};

async function getDefaultCalendarId(): Promise<string> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') throw new Error('Calendar permission denied');

  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return defaultCal.id;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const primary = calendars.find(c => c.isPrimary) ?? calendars[0];
  if (!primary) throw new Error('No calendar found on device');
  return primary.id;
}

export async function exportPlanToCalendar(
  plan: TrainingWeek[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const calId = await getDefaultCalendarId();

  const workouts = plan.flatMap(week =>
    week.workouts.filter(w => w.type !== 'rest')
  );

  let exported = 0;
  for (const workout of workouts) {
    const label = WORKOUT_LABELS[workout.type] ?? workout.type;
    const durationMins = workout.durationMins ?? WORKOUT_DURATION_MINS[workout.type] ?? 45;
    const startDate = parseISO(`${workout.date}T07:00:00`);
    const endDate = addMinutes(startDate, durationMins);
    const notes = [
      workout.distanceMiles ? `${workout.distanceMiles} miles` : '',
      workout.notes,
    ]
      .filter(Boolean)
      .join(' — ');

    await Calendar.createEventAsync(calId, {
      title: label,
      startDate,
      endDate,
      notes: notes || undefined,
      alarms: [{ relativeOffset: -30 }],
    });
    exported++;
    onProgress?.(exported, workouts.length);
  }
  return exported;
}
