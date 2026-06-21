import { format, parseISO, differenceInDays } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, ProgressBar, Surface, Text } from 'react-native-paper';
import WorkoutCard from '../../components/WorkoutCard';
import { loadPTLog, loadTrainingPlan, loadUserProfile, loadWorkoutLog, savePTLog, saveWorkoutLog } from '../../lib/storage';
import { getDailyQuote } from '../../lib/quotes';
import { computeStreak, getEarnedBadges } from '../../lib/streaks';
import { patchWorkoutLogEntry, loadStreakMeta, saveStreakMeta } from '../../lib/storage';
import type { PTLog, StreakMeta, TrainingWeek, UserProfile, Workout, WorkoutLog } from '../../types';

const TODAY = format(new Date(), 'yyyy-MM-dd');

function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  try { return differenceInDays(parseISO(dateStr), new Date()); } catch { return 0; }
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

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [ptLog, setPtLog] = useState<PTLog>({});
  const [streakMeta, setStreakMeta] = useState<StreakMeta>({ longestStreak: 0, totalWorkoutsCompleted: 0 });
  const [painLevel, setPainLevel] = useState(3);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, pl, wl, ptl, sm] = await Promise.all([
      loadUserProfile(), loadTrainingPlan(), loadWorkoutLog(), loadPTLog(), loadStreakMeta(),
    ]);
    if (p) { setProfile(p); setPainLevel(p.hipPainLevel); }
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
      [TODAY]: { ...workoutLog[TODAY], completed: true, painLevelAtTime: painLevel },
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
      [TODAY]: { ...workoutLog[TODAY], swappedToCrossTraining: true, painLevelAtTime: painLevel },
    };
    setWorkoutLog(updated);
    await saveWorkoutLog(updated);
  }

  if (!profile || plan.length === 0) {
    return <View style={styles.centered}><Text>Loading your plan…</Text></View>;
  }

  const currentWeek = findCurrentWeek(plan);
  const todayWorkout = currentWeek ? getTodayWorkout(currentWeek) : undefined;
  const todayLog = workoutLog[TODAY];
  const todayPTDone = (ptLog[TODAY] ?? []).length;
  const daysToWine = daysUntil(profile.wineAndDineDate);
  const daysToDopey = daysUntil(profile.dopeyStartDate);
  const weekMilesDone = currentWeek ? weeklyMilesDone(plan, workoutLog, currentWeek.startDate) : 0;
  const weekMilesTarget = currentWeek
    ? currentWeek.workouts.filter(w => w.type === 'easy_run' || w.type === 'long_run' || w.type === 'race').reduce((s, w) => s + (w.distanceMiles ?? 0), 0)
    : 0;
  const weekProgress = weekMilesTarget > 0 ? weekMilesDone / weekMilesTarget : 0;
  const showSwap = painLevel >= 6 && todayWorkout?.type !== 'rest' && todayWorkout?.type !== 'pt_only';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      <View style={styles.greeting}>
        <Text variant="headlineSmall" style={styles.greetingText}>Hey, {profile.name}! 👋</Text>
        <Text variant="bodyMedium" style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        {currentWeek && (
          <Chip style={styles.phaseChip} textStyle={styles.phaseChipText}>
            Week {currentWeek.weekNumber} · {currentWeek.phaseName}
          </Chip>
        )}
      </View>

      {(() => {
        const q = getDailyQuote();
        return (
          <Surface style={styles.quoteCard} elevation={0}>
            <Text style={styles.quoteText}>"{q.text}"</Text>
            <Text style={styles.quoteAuthor}>— {q.author}</Text>
          </Surface>
        );
      })()}

      {(() => {
        const streak = computeStreak(workoutLog, plan);
        const badges = getEarnedBadges(streak, streakMeta.longestStreak);
        if (streak === 0 && badges.length === 0) return null;
        return (
          <Surface style={styles.streakCard} elevation={1}>
            <View style={styles.streakRow}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
              {badges.length > 0 && <Text style={styles.streakBadge}>{badges[badges.length - 1].emoji}</Text>}
            </View>
            {streakMeta.longestStreak > streak && (
              <Text style={styles.streakBest}>Best: {streakMeta.longestStreak} days</Text>
            )}
          </Surface>
        );
      })()}

      <View style={styles.countdownRow}>
        <Surface style={[styles.countdown, { backgroundColor: '#dbeafe' }]} elevation={1}>
          <Text style={styles.countdownNum}>{Math.max(daysToWine, 0)}</Text>
          <Text style={styles.countdownLabel}>days to{'\n'}Wine & Dine</Text>
        </Surface>
        <Surface style={[styles.countdown, { backgroundColor: '#fef3c7' }]} elevation={1}>
          <Text style={[styles.countdownNum, { color: '#92400e' }]}>{Math.max(daysToDopey, 0)}</Text>
          <Text style={[styles.countdownLabel, { color: '#92400e' }]}>days to{'\n'}Dopey</Text>
        </Surface>
      </View>

      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
          <Text variant="titleSmall" style={styles.cardTitle}>This Week's Mileage</Text>
          <Text variant="bodySmall" style={styles.milesText}>{weekMilesDone.toFixed(1)} / {weekMilesTarget.toFixed(1)} mi</Text>
        </View>
        <ProgressBar progress={Math.min(weekProgress, 1)} color="#1e40af" style={styles.progressBar} />
      </Surface>

      <Surface style={styles.card} elevation={1}>
        <Text variant="titleSmall" style={styles.cardTitle}>How are your hips today?</Text>
        <View style={styles.painRow}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <Button key={n} mode={painLevel === n ? 'contained' : 'outlined'} onPress={() => setPainLevel(n)}
              style={[styles.painBtn, painLevel === n && { backgroundColor: painBtnColor(n) }]}
              labelStyle={[{ fontSize: 11, fontWeight: '700' }, painLevel === n && { color: '#fff' }]}
              contentStyle={{ paddingHorizontal: 0, minWidth: 0 }}>{String(n)}</Button>
          ))}
        </View>
        <Text style={[styles.painNote, { color: painBtnColor(painLevel) }]}>{painLevelNote(painLevel)}</Text>
        {showSwap && <Text style={styles.swapHint}>Pain is high — consider swapping today's run for cross-training below.</Text>}
      </Surface>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.sectionTitle}>Today's Workout</Text>
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
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.noWorkout}>No workout scheduled for today. Rest up!</Text>
        </Surface>
      )}

      {todayPTDone < 3 && (
        <Surface style={styles.ptNudge} elevation={1}>
          <Text style={styles.ptNudgeText}>💪 Don't forget your hip PT exercises today! ({todayPTDone} done)</Text>
        </Surface>
      )}
    </ScrollView>
  );
}

function painBtnColor(n: number): string {
  if (n <= 3) return '#16a34a';
  if (n <= 5) return '#d97706';
  if (n <= 7) return '#ea580c';
  return '#dc2626';
}

function painLevelNote(n: number): string {
  if (n === 1) return '1 – No pain. Perfect running day!';
  if (n <= 3) return `${n} – Mild. All systems go.`;
  if (n <= 5) return `${n} – Moderate. Listen to your body; easy effort only.`;
  if (n <= 7) return `${n} – Significant. Consider cross-training today.`;
  return `${n} – High pain. Cross-train or rest, and check with your PT.`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 16, paddingTop: 56, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { marginBottom: 16 },
  greetingText: { fontWeight: '800', color: '#1e40af' },
  dateText: { color: '#6b7280', marginTop: 2 },
  phaseChip: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#dbeafe' },
  phaseChipText: { color: '#1e40af', fontSize: 11 },
  countdownRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  countdown: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  countdownNum: { fontSize: 36, fontWeight: '900', color: '#1e40af' },
  countdownLabel: { fontSize: 11, color: '#3730a3', textAlign: 'center', marginTop: 2 },
  card: { borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontWeight: '700', color: '#374151' },
  milesText: { color: '#6b7280' },
  progressBar: { height: 8, borderRadius: 4 },
  painRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginVertical: 10 },
  painBtn: { width: 40, minWidth: 0, height: 36, borderRadius: 8 },
  painNote: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  swapHint: { color: '#b45309', backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginTop: 8, fontSize: 12 },
  divider: { marginVertical: 12 },
  sectionTitle: { fontWeight: '700', color: '#374151', marginBottom: 8 },
  noWorkout: { color: '#6b7280', textAlign: 'center', paddingVertical: 8 },
  ptNudge: { borderRadius: 12, padding: 14, backgroundColor: '#f5f3ff', marginTop: 12 },
  ptNudgeText: { color: '#5b21b6', fontWeight: '600' },
  quoteCard: { borderRadius: 12, padding: 14, backgroundColor: '#f0f9ff', marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#38bdf8' },
  quoteText: { color: '#0c4a6e', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  quoteAuthor: { color: '#0369a1', fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'right' },
  streakCard: { borderRadius: 12, padding: 12, backgroundColor: '#fff7ed', marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#f97316' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakFlame: { fontSize: 22 },
  streakCount: { fontSize: 28, fontWeight: '900', color: '#c2410c' },
  streakLabel: { fontSize: 13, color: '#9a3412', fontWeight: '600', flex: 1 },
  streakBadge: { fontSize: 24 },
  streakBest: { fontSize: 11, color: '#c2410c', marginTop: 2 },
});
