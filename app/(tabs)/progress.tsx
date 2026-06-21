import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Surface, Text } from 'react-native-paper';
import { loadStreakMeta, loadTrainingPlan, loadUserProfile, loadWorkoutLog } from '../../lib/storage';
import { computeStreak, countTotalCompleted, getEarnedBadges, MILESTONE_BADGES } from '../../lib/streaks';
import { buildPredictions, getRecentPaceLogs } from '../../lib/racePredictions';
import { formatPace } from '../../lib/fueling';
import { format, parseISO } from 'date-fns';
import type { StreakMeta, TrainingWeek, UserProfile, WorkoutLog } from '../../types';

export default function ProgressScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [log, setLog] = useState<WorkoutLog>({});
  const [streakMeta, setStreakMeta] = useState<StreakMeta>({ longestStreak: 0, totalWorkoutsCompleted: 0 });

  const load = useCallback(async () => {
    const [p, pl, wl, sm] = await Promise.all([
      loadUserProfile(),
      loadTrainingPlan(),
      loadWorkoutLog(),
      loadStreakMeta(),
    ]);
    if (p) setProfile(p);
    if (pl) setPlan(pl);
    setLog(wl);
    setStreakMeta(sm);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const streak = computeStreak(log, plan);
  const totalDone = countTotalCompleted(log, plan);
  const earned = getEarnedBadges(streak, streakMeta.longestStreak);
  const { predictions, basedOnActual, basePace } = buildPredictions(
    profile.currentPaceMinPerMile ?? 13,
    log,
    plan
  );
  const paceHistory = getRecentPaceLogs(log, plan, 8);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Progress</Text>

      <Surface style={styles.card} elevation={1}>
        <Text variant="titleSmall" style={styles.cardTitle}>Current Streak</Text>
        <View style={styles.streakRow}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakDays}>days</Text>
        </View>
        <View style={styles.streakStats}>
          <View style={styles.streakStat}>
            <Text style={styles.streakStatVal}>{streakMeta.longestStreak}</Text>
            <Text style={styles.streakStatLabel}>Best streak</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakStat}>
            <Text style={styles.streakStatVal}>{totalDone}</Text>
            <Text style={styles.streakStatLabel}>Total workouts</Text>
          </View>
        </View>
      </Surface>

      <Surface style={styles.card} elevation={1}>
        <Text variant="titleSmall" style={styles.cardTitle}>Milestone Badges</Text>
        <View style={styles.badgeGrid}>
          {MILESTONE_BADGES.map(badge => {
            const isEarned = earned.some(e => e.id === badge.id);
            return (
              <View key={badge.id} style={[styles.badge, !isEarned && styles.badgeLocked]}>
                <Text style={[styles.badgeEmoji, !isEarned && styles.badgeEmojiLocked]}>
                  {isEarned ? badge.emoji : '🔒'}
                </Text>
                <Text style={[styles.badgeLabel, !isEarned && styles.badgeLabelLocked]}>
                  {badge.label}
                </Text>
              </View>
            );
          })}
        </View>
      </Surface>

      <Divider style={styles.divider} />

      <Surface style={styles.card} elevation={1}>
        <Text variant="titleSmall" style={styles.cardTitle}>Race Time Predictions</Text>
        <Text style={styles.predictionNote}>
          {basedOnActual
            ? `Based on your logged pace of ${formatPace(basePace)}/mi`
            : `Based on your easy pace of ${formatPace(profile.currentPaceMinPerMile ?? 13)}/mi`}
        </Text>
        {predictions.map(p => (
          <View key={p.name} style={styles.predRow}>
            <Text style={styles.predName}>{p.name}</Text>
            <Text style={styles.predTime}>{p.formattedTime}</Text>
          </View>
        ))}
        {!basedOnActual && (
          <Text style={styles.predHint}>💡 Log your actual pace after runs to improve predictions.</Text>
        )}
      </Surface>

      {paceHistory.length > 0 && (
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleSmall" style={styles.cardTitle}>Recent Run Paces</Text>
          {paceHistory.map((entry, i) => (
            <View key={i} style={styles.paceRow}>
              <View>
                <Text style={styles.paceDate}>{format(parseISO(entry.date), 'MMM d')}</Text>
                <Text style={styles.paceDist}>{entry.miles} mi</Text>
              </View>
              <Text style={styles.pacePace}>{formatPace(entry.paceMinPerMile)}/mi</Text>
            </View>
          ))}
        </Surface>
      )}

      {paceHistory.length === 0 && (
        <Surface style={[styles.card, styles.emptyCard]} elevation={0}>
          <Text style={styles.emptyText}>🏃 Complete runs and log your pace to see it here.</Text>
        </Surface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 16, paddingTop: 56, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: '800', color: '#1e40af', marginBottom: 16 },
  card: { borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 14 },
  cardTitle: { fontWeight: '700', color: '#374151', marginBottom: 10 },
  divider: { marginVertical: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  streakFlame: { fontSize: 36 },
  streakNum: { fontSize: 52, fontWeight: '900', color: '#c2410c', lineHeight: 58 },
  streakDays: { fontSize: 18, color: '#9a3412', fontWeight: '600' },
  streakStats: { flexDirection: 'row', alignItems: 'center' },
  streakStat: { flex: 1, alignItems: 'center' },
  streakStatVal: { fontSize: 22, fontWeight: '800', color: '#1e40af' },
  streakStatLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  streakDivider: { width: 1, height: 36, backgroundColor: '#e5e7eb' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { alignItems: 'center', width: 72, padding: 8, borderRadius: 8, backgroundColor: '#fef3c7' },
  badgeLocked: { backgroundColor: '#f3f4f6' },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeLabel: { fontSize: 10, fontWeight: '700', color: '#92400e', textAlign: 'center' },
  badgeLabelLocked: { color: '#9ca3af' },
  predictionNote: { fontSize: 11, color: '#6b7280', marginBottom: 10, fontStyle: 'italic' },
  predRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  predName: { fontSize: 14, color: '#374151', fontWeight: '500' },
  predTime: { fontSize: 14, color: '#1e40af', fontWeight: '700' },
  predHint: { fontSize: 11, color: '#6b7280', marginTop: 10, lineHeight: 16 },
  paceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  paceDate: { fontSize: 13, fontWeight: '600', color: '#374151' },
  paceDist: { fontSize: 11, color: '#9ca3af' },
  pacePace: { fontSize: 14, fontWeight: '700', color: '#1e40af' },
  emptyCard: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  emptyText: { color: '#9ca3af', textAlign: 'center', fontSize: 13 },
});
