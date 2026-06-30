import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Surface, Text } from 'react-native-paper';
import { loadStreakMeta, loadTrainingPlan, loadUserProfile, loadWorkoutLog } from '../../lib/storage';
import { computeStreak, countTotalCompleted, getEarnedBadges, MILESTONE_BADGES } from '../../lib/streaks';
import { buildPredictions, getRecentPaceLogs } from '../../lib/racePredictions';
import { formatPace } from '../../lib/fueling';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../constants/theme';
import type { StreakMeta, TrainingWeek, UserProfile, WorkoutLog } from '../../types';

export default function ProgressScreen() {
  const { colors } = useTheme();
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
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineSmall" style={[styles.title, { color: colors.textPrimary }]}>Progress</Text>

      {/* Streak */}
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.textPrimary }]}>Current Streak</Text>
        <View style={styles.streakRow}>
          <Text style={[styles.streakNum, { color: colors.accent }]}>{streak}</Text>
          <Text style={[styles.streakDays, { color: colors.accent }]}>days</Text>
        </View>
        <View style={styles.streakStats}>
          <View style={styles.streakStat}>
            <Text style={[styles.streakStatVal, { color: colors.accent }]}>{streakMeta.longestStreak}</Text>
            <Text style={[styles.streakStatLabel, { color: colors.textSecondary }]}>Best streak</Text>
          </View>
          <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
          <View style={styles.streakStat}>
            <Text style={[styles.streakStatVal, { color: colors.accent }]}>{totalDone}</Text>
            <Text style={[styles.streakStatLabel, { color: colors.textSecondary }]}>Total workouts</Text>
          </View>
        </View>
      </Surface>

      {/* Milestone badges */}
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.textPrimary }]}>Milestone Badges</Text>
        <View style={styles.badgeGrid}>
          {MILESTONE_BADGES.map(badge => {
            const isEarned = earned.some(e => e.id === badge.id);
            return (
              <View
                key={badge.id}
                style={[
                  styles.badge,
                  { backgroundColor: isEarned ? colors.warning + '33' : colors.border },
                ]}
              >
                <Text style={[styles.badgeEmoji, !isEarned && styles.badgeEmojiLocked]}>
                  {isEarned ? badge.emoji : '🔒'}
                </Text>
                <Text style={[styles.badgeLabel, { color: isEarned ? colors.warning : colors.textSecondary }]}>
                  {badge.label}
                </Text>
              </View>
            );
          })}
        </View>
      </Surface>

      <Divider style={styles.divider} />

      {/* Race predictions */}
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.textPrimary }]}>Race Time Predictions</Text>
        <Text style={[styles.predictionNote, { color: colors.textSecondary }]}>
          {basedOnActual
            ? `Based on your logged pace of ${formatPace(basePace)}/mi`
            : `Based on your easy pace of ${formatPace(profile.currentPaceMinPerMile ?? 13)}/mi`}
        </Text>
        {predictions.map(p => (
          <View key={p.name} style={[styles.predRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.predName, { color: colors.textPrimary }]}>{p.name}</Text>
            <Text style={[styles.predTime, { color: colors.accent }]}>{p.formattedTime}</Text>
          </View>
        ))}
        {!basedOnActual && (
          <Text style={[styles.predHint, { color: colors.textSecondary }]}>
            Log your actual pace after runs to improve predictions.
          </Text>
        )}
      </Surface>

      {/* Pace history */}
      {paceHistory.length > 0 && (
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleSmall" style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Run Paces</Text>
          {paceHistory.map((entry, i) => (
            <View key={i} style={[styles.paceRow, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.paceDate, { color: colors.textPrimary }]}>{format(parseISO(entry.date), 'MMM d')}</Text>
                <Text style={[styles.paceDist, { color: colors.textSecondary }]}>{entry.miles} mi</Text>
              </View>
              <Text style={[styles.pacePace, { color: colors.accent }]}>{formatPace(entry.paceMinPerMile)}/mi</Text>
            </View>
          ))}
        </Surface>
      )}

      {paceHistory.length === 0 && (
        <Surface style={[styles.card, styles.emptyCard, { backgroundColor: '#1e3060', borderColor: colors.border }]} elevation={0}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Complete runs and log your pace to see it here.
          </Text>
        </Surface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 56, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: '800', marginBottom: 16 },
  card: { borderRadius: 12, padding: 14, marginBottom: 14 },
  cardTitle: { fontWeight: '700', marginBottom: 10 },
  divider: { marginVertical: 8 },

  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  streakNum: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
  streakDays: { fontSize: 18, fontWeight: '600' },
  streakStats: { flexDirection: 'row', alignItems: 'center' },
  streakStat: { flex: 1, alignItems: 'center' },
  streakStatVal: { fontSize: 22, fontWeight: '800' },
  streakStatLabel: { fontSize: 11, marginTop: 2 },
  streakDivider: { width: 1, height: 36 },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { alignItems: 'center', width: 72, padding: 8, borderRadius: 8 },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeEmojiLocked: { opacity: 0.5 },
  badgeLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  predictionNote: { fontSize: 11, marginBottom: 10, fontStyle: 'italic' },
  predRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1 },
  predName: { fontSize: 14, fontWeight: '500' },
  predTime: { fontSize: 14, fontWeight: '700' },
  predHint: { fontSize: 11, marginTop: 10, lineHeight: 16 },

  paceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  paceDate: { fontSize: 13, fontWeight: '600' },
  paceDist: { fontSize: 11 },
  pacePace: { fontSize: 14, fontWeight: '700' },

  emptyCard: { borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { textAlign: 'center', fontSize: 13 },
});
