import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Surface, Text } from 'react-native-paper';
import PTExerciseCard from '../../components/PTExerciseCard';
import { getDailyPTExercises, PT_EXERCISES } from '../../lib/ptExercises';
import { loadPTLog, loadTrainingPlan, loadUserProfile, savePTLog } from '../../lib/storage';
import { useTheme } from '../../constants/theme';
import type { PTLog, TrainingWeek } from '../../types';

const TODAY = format(new Date(), 'yyyy-MM-dd');

function getCurrentPhase(plan: TrainingWeek[]): number {
  const current = plan.find(w => w.startDate <= TODAY);
  return current?.phase ?? 1;
}

export default function PTScreen() {
  const { colors } = useTheme();
  const [ptLog, setPTLog] = useState<PTLog>({});
  const [phase, setPhase] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [log, plan] = await Promise.all([
      loadPTLog(),
      loadTrainingPlan(),
      loadUserProfile(),
    ]);
    setPTLog(log);
    if (plan && plan.length > 0) setPhase(getCurrentPhase(plan));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayDone: string[] = ptLog[TODAY] ?? [];
  const todayExercises = getDailyPTExercises(phase);
  const completedCount = todayDone.length;
  const totalCount = todayExercises.length;

  async function toggleExercise(id: string) {
    const current = ptLog[TODAY] ?? [];
    const updated = current.includes(id)
      ? current.filter(e => e !== id)
      : [...current, id];
    const newLog = { ...ptLog, [TODAY]: updated };
    setPTLog(newLog);
    await savePTLog(newLog);
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
          Injury & Recovery
        </Text>
        <Text variant="bodySmall" style={{ color: colors.primary, marginTop: 2 }}>
          Exercises & rehabilitation
        </Text>
      </View>

      {/* Today's session */}
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.sessionHeader}>
          <Text variant="titleMedium" style={[styles.sessionTitle, { color: colors.text }]}>
            Today's Session
          </Text>
          <Text style={[
            styles.sessionCount,
            { color: completedCount === totalCount ? colors.success : colors.primary },
          ]}>
            {completedCount}/{totalCount} done
          </Text>
        </View>

        {completedCount === totalCount && totalCount > 0 && (
          <Surface style={[styles.allDoneBanner, { backgroundColor: colors.success + '22' }]} elevation={0}>
            <Text style={[styles.allDoneText, { color: colors.success }]}>
              🎉 All exercises complete! Great work!
            </Text>
          </Surface>
        )}

        {todayExercises.map(ex => (
          <PTExerciseCard
            key={ex.id}
            exercise={ex}
            completed={todayDone.includes(ex.id)}
            onToggle={() => toggleExercise(ex.id)}
          />
        ))}
      </Surface>

      {/* Why these exercises */}
      <Surface style={[styles.infoCard, { backgroundColor: colors.primary + '11' }]} elevation={1}>
        <Text variant="titleSmall" style={[styles.infoTitle, { color: colors.primary }]}>
          Why These Exercises?
        </Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          The gluteus minimus stabilizes your pelvis during the single-leg stance phase of running.
          A tear reduces this stability, causing compensatory patterns that can lead to IT band pain,
          knee issues, and altered gait.{'\n\n'}
          These exercises specifically target hip abductor strength and neuromuscular control —
          the foundation you need before adding running volume.
        </Text>
      </Surface>

      <Divider style={styles.divider} />

      {/* Full library */}
      <Text variant="titleMedium" style={[styles.libraryTitle, { color: colors.text }]}>
        Full Exercise Library
      </Text>
      <Text variant="bodySmall" style={[styles.librarySubtitle, { color: colors.text + 'aa' }]}>
        Tap any exercise to see full instructions
      </Text>

      {PT_EXERCISES.map(ex => (
        <PTExerciseCard
          key={ex.id}
          exercise={ex}
          completed={todayDone.includes(ex.id)}
          onToggle={() => toggleExercise(ex.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 56, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontWeight: '800' },
  card: { borderRadius: 12, padding: 14, marginBottom: 16 },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionTitle: { fontWeight: '700' },
  sessionCount: { fontWeight: '700' },
  allDoneBanner: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  allDoneText: { fontWeight: '600', textAlign: 'center' },
  infoCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoTitle: { fontWeight: '700', marginBottom: 8 },
  infoText: { lineHeight: 20, fontSize: 13 },
  divider: { marginVertical: 12 },
  libraryTitle: { fontWeight: '700', marginBottom: 4 },
  librarySubtitle: { marginBottom: 10 },
});
