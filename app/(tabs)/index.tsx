import { format, parseISO, differenceInDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, ProgressBar, Surface, Text } from 'react-native-paper';
import WorkoutCard from '../../components/WorkoutCard';
import {
  loadPTLog,
  loadTrainingPlan,
  loadUserProfile,
  loadWorkoutLog,
  savePTLog,
  saveWorkoutLog,
} from '../../lib/storage';
import { getDailyQuote } from '../../lib/quotes';
import { computeStreak, getEarnedBadges } from '../../lib/streaks';
import { patchWorkoutLogEntry, loadStreakMeta, saveStreakMeta } from '../../lib/storage';
import type { PTLog, Race, StreakMeta, TrainingWeek, UserProfile, Workout, WorkoutLog } from '../../types';
import { useTheme } from '../../constants/theme';

const TODAY = format(new Date(), 'yyyy-MM-dd');

function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

function weeklyMilesDone(plan: TrainingWeek[], log: WorkoutLog, weekStart: string): number {
  const week = plan.find(w => w.startDate === weekStart);
  if (!week) return 0;
  return week.workouts
    .filter(w => log[w.date]?.completed && (w.type === 'easy_run' || w.type === 'long_run' || w.type === 'race'))
    .reduce((sum, w) => sum + (w.distanceMiles ?? 0), 0);
}

function findCurrentWeek(plan: TrainingWeek[]): TrainingWeek | undefined {
  return plan.find(w => w.startDate <= TODAY && getTodayWorkout(w) !== undefined)
    ?? plan.find(w => w.startDate <= TODAY);
}

function getTodayWorkout(week: TrainingWeek): Workout | undefined {
  return week.workouts.find(w => w.date === TODAY);
}

function feelingColor(n: number, theme: ReturnType<typeof useTheme>): string {
  if (n <= 3) return theme.colors.success;
  if (n <= 5) return theme.colors.warning;
  if (n <= 7) return theme.colors.accent;
  return theme.colors.danger;
}

function feelingNote(n: number): string {
  if (n === 0) return 'Move the slider to check in.';
  if (n <= 2) return `${n} – Feeling great. Let's get after it!`;
  if (n <= 4) return `${n} – Feeling good. All systems go.`;
  if (n <= 6) return `${n} – Feeling okay. Easy effort today.`;
  if (n <= 8) return `${n} – Feeling rough. Consider cross-training.`;
  return `${n} – Not great. Rest or cross-train, and take care of yourself.`;
}

export default function Dashboard() {
  const theme = useTheme();
  const s = makeStyles(theme);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [ptLog, setPtLog] = useState<PTLog>({});
  const [streakMeta, setStreakMeta] = useState<StreakMeta>({ longestStreak: 0, totalWorkoutsCompleted: 0 });
  const [feelingLevel, setFeelingLevel] = useState(3);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, pl, wl, ptl, sm] = await Promise.all([
      loadUserProfile(),
      loadTrainingPlan(),
      loadWorkoutLog(),
      loadPTLog(),
      loadStreakMeta(),
    ]);
    if (p) { setProfile(p); setFeelingLevel(p.feelingLevel); }
    if (pl) setPlan(pl);
    setWorkoutLog(wl);
    setPtLog(ptl);
    setStreakMeta(sm);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function markComplete() {
    const updated: WorkoutLog = {
      ...workoutLog,
      [TODAY]: { ...workoutLog[TODAY], completed: true, painLevelAtTime: feelingLevel },
    };
    setWorkoutLog(updated);
    await saveWorkoutLog(updated);

    const newStreak = computeStreak(updated, plan);
    const newMeta: StreakMeta = {
      longestStreak: Math.max(streakMeta.longestStreak, newStreak),
      totalWorkoutsCompleted: streakMeta.totalWorkoutsCompleted + 1,
    };
    setStreakMeta(newMeta);
    await saveStreakMeta(newMeta);
  }

  async function saveRunData(date: string, pace?: number, gels?: number) {
    const updated = await patchWorkoutLogEntry(date, {
      ...(pace !== undefined ? { actualPaceMinPerMile: pace } : {}),
      ...(gels !== undefined ? { gelsConsumed: gels } : {}),
    });
    setWorkoutLog(updated);
  }

  async function swapToCrossTraining() {
    const updated: WorkoutLog = {
      ...workoutLog,
      [TODAY]: { ...workoutLog[TODAY], swappedToCrossTraining: true, painLevelAtTime: feelingLevel },
    };
    setWorkoutLog(updated);
    await saveWorkoutLog(updated);
  }

  if (!profile || plan.length === 0) {
    return (
      <View style={s.centered}>
        <Text>Loading your plan…</Text>
      </View>
    );
  }

  const currentWeek = findCurrentWeek(plan);
  const todayWorkout = currentWeek ? getTodayWorkout(currentWeek) : undefined;
  const todayLog = workoutLog[TODAY];
  const todayPTDone = (ptLog[TODAY] ?? []).length;

  const upcomingRaces: Race[] = (profile.races ?? [])
    .filter((r: Race) => daysUntil(r.date) >= 0)
    .sort((a: Race, b: Race) => daysUntil(a.date) - daysUntil(b.date));

  const weekMilesDone = currentWeek
    ? weeklyMilesDone(plan, workoutLog, currentWeek.startDate)
    : 0;
  const weekMilesTarget = currentWeek
    ? currentWeek.workouts
        .filter(w => w.type === 'easy_run' || w.type === 'long_run' || w.type === 'race')
        .reduce((s, w) => s + (w.distanceMiles ?? 0), 0)
    : 0;
  const weekProgress = weekMilesTarget > 0 ? weekMilesDone / weekMilesTarget : 0;

  const showSwap = feelingLevel >= 6 && todayWorkout?.type !== 'rest' && todayWorkout?.type !== 'pt_only';

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Greeting */}
      <View style={s.greeting}>
        <Text variant="headlineSmall" style={s.greetingText}>
          {profile.name}
        </Text>
        <Text variant="bodyMedium" style={s.dateText}>
          {format(new Date(), 'EEEE, MMMM d')}
        </Text>
        {currentWeek && (
          <Chip style={s.phaseChip} textStyle={s.phaseChipText}>
            Week {currentWeek.weekNumber} · {currentWeek.phaseName}
          </Chip>
        )}
      </View>

      {/* Daily quote */}
      {(() => {
        const q = getDailyQuote();
        return (
          <Surface style={s.quoteCard} elevation={0}>
            <Text style={s.quoteText}>"{q.text}"</Text>
            <Text style={s.quoteAuthor}>— {q.author}</Text>
          </Surface>
        );
      })()}

      {/* Streak */}
      {(() => {
        const streak = computeStreak(workoutLog, plan);
        const badges = getEarnedBadges(streak, streakMeta.longestStreak);
        if (streak === 0 && badges.length === 0) return null;
        return (
          <Surface style={s.streakCard} elevation={1}>
            <View style={s.streakRow}>
              <Text style={s.streakCount}>{streak}</Text>
              <Text style={s.streakLabel}>day streak</Text>
              {badges.length > 0 && (
                <Text style={s.streakBadge}>{badges[badges.length - 1].emoji}</Text>
              )}
            </View>
            {streakMeta.longestStreak > streak && (
              <Text style={s.streakBest}>Best: {streakMeta.longestStreak} days</Text>
            )}
          </Surface>
        );
      })()}

      {/* Race countdowns */}
      {upcomingRaces.length > 0 && (
        <View style={s.countdownRow}>
          {upcomingRaces.slice(0, 3).map(race => (
            <Surface key={race.id} style={s.countdown} elevation={1}>
              <Text style={s.countdownNum}>{daysUntil(race.date)}</Text>
              <Text style={s.countdownLabel} numberOfLines={2}>{race.name}</Text>
            </Surface>
          ))}
        </View>
      )}

      {/* Weekly mileage progress */}
      <Surface style={s.card} elevation={1}>
        <View style={s.cardHeader}>
          <Text variant="titleSmall" style={s.cardTitle}>This Week's Mileage</Text>
          <Text variant="bodySmall" style={s.milesText}>
            {weekMilesDone.toFixed(1)} / {weekMilesTarget.toFixed(1)} mi
          </Text>
        </View>
        <ProgressBar progress={Math.min(weekProgress, 1)} color={theme.colors.primary} style={s.progressBar} />
      </Surface>

      {/* Feeling check-in */}
      <Surface style={s.card} elevation={1}>
        <Text variant="titleSmall" style={s.cardTitle}>How are you feeling today?</Text>
        <View style={s.feelingGrid}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <Button
              key={n}
              mode={feelingLevel === n ? 'contained' : 'outlined'}
              onPress={() => setFeelingLevel(n)}
              style={[s.feelingBtn, feelingLevel === n && { backgroundColor: feelingColor(n, theme) }]}
              labelStyle={[s.feelingBtnLabel, feelingLevel === n && { color: '#fff' }]}
              contentStyle={{ paddingHorizontal: 0, minWidth: 0 }}
            >
              {String(n)}
            </Button>
          ))}
        </View>
        <Text style={[s.feelingNote, { color: feelingColor(feelingLevel, theme) }]}>
          {feelingNote(feelingLevel)}
        </Text>
        {showSwap && (
          <Text style={s.swapHint}>
            Feeling rough — consider swapping today's run for cross-training below.
          </Text>
        )}
      </Surface>

      <Divider style={s.divider} />

      {/* Today's workout */}
      <Text variant="titleMedium" style={s.sectionTitle}>Today's Workout</Text>
      {todayWorkout ? (
        <WorkoutCard
          workout={todayWorkout}
          logEntry={todayLog}
          onComplete={markComplete}
          onSwapCrossTraining={swapToCrossTraining}
          showSwap={showSwap}
          paceMinPerMile={profile.currentPaceMinPerMile ?? 12}
          prefersTreadmill={profile.prefersTreadmill ?? false}
          onSaveRunData={saveRunData}
        />
      ) : (
        <Surface style={s.card} elevation={1}>
          <Text style={s.noWorkout}>No workout scheduled for today. Rest up!</Text>
        </Surface>
      )}

      {/* PT nudge */}
      {todayPTDone < 3 && (
        <Surface style={s.ptNudge} elevation={1}>
          <Text style={s.ptNudgeText}>
            Don't forget your PT exercises today! ({todayPTDone} done)
          </Text>
        </Surface>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md, paddingTop: 56, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    greeting: { marginBottom: theme.spacing.md },
    greetingText: { fontWeight: '800', color: theme.colors.primary },
    dateText: { color: theme.colors.text, opacity: 0.6, marginTop: 2 },
    phaseChip: { alignSelf: 'flex-start', marginTop: theme.spacing.sm, backgroundColor: theme.colors.surface },
    phaseChipText: { color: theme.colors.primary, fontSize: theme.typography.xs },
    countdownRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
    countdown: {
      flex: 1,
      borderRadius: theme.borderRadius.md,
      padding: 14,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    countdownNum: { fontSize: 36, fontWeight: '900', color: theme.colors.primary },
    countdownLabel: { fontSize: theme.typography.xs, color: theme.colors.text, textAlign: 'center', marginTop: 2, opacity: 0.7 },
    card: { borderRadius: theme.borderRadius.md, padding: 14, backgroundColor: theme.colors.surface, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontWeight: '700', color: theme.colors.text },
    milesText: { color: theme.colors.text, opacity: 0.6 },
    progressBar: { height: 8, borderRadius: 4 },
    feelingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: theme.spacing.sm },
    feelingBtn: { width: 44, minWidth: 0 },
    feelingBtnLabel: { fontSize: 13, fontWeight: '700' },
    feelingNote: { fontSize: theme.typography.sm, fontWeight: '600', textAlign: 'center', marginTop: 4 },
    swapHint: {
      color: theme.colors.warning,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.sm,
    },
    divider: { marginVertical: 12 },
    sectionTitle: { fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
    noWorkout: { color: theme.colors.text, opacity: 0.6, textAlign: 'center', paddingVertical: 8 },
    ptNudge: {
      borderRadius: theme.borderRadius.md,
      padding: 14,
      backgroundColor: theme.colors.surface,
      marginTop: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
    },
    ptNudgeText: { color: theme.colors.accent, fontWeight: '600' },
    quoteCard: {
      borderRadius: theme.borderRadius.md,
      padding: 14,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    quoteText: {
      color: theme.colors.text,
      fontSize: theme.typography.sm,
      fontStyle: 'italic',
      lineHeight: 19,
    },
    quoteAuthor: {
      color: theme.colors.primary,
      fontSize: theme.typography.xs,
      fontWeight: '600',
      marginTop: 6,
      textAlign: 'right',
    },
    streakCard: {
      borderRadius: theme.borderRadius.md,
      padding: 12,
      backgroundColor: theme.colors.surface,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.accent,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    streakCount: { fontSize: 28, fontWeight: '900', color: theme.colors.accent },
    streakLabel: { fontSize: theme.typography.sm, color: theme.colors.text, fontWeight: '600', flex: 1 },
    streakBadge: { fontSize: 24 },
    streakBest: { fontSize: theme.typography.xs, color: theme.colors.accent, marginTop: 2 },
  });
}
