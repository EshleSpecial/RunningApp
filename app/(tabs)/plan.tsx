import { format, parseISO } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Surface, Text } from 'react-native-paper';
import WorkoutCard from '../../components/WorkoutCard';
import { loadTrainingPlan, loadWorkoutLog } from '../../lib/storage';
import { exportPlanToCalendar } from '../../lib/calendar';
import type { TrainingWeek, WorkoutLog } from '../../types';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const PHASE_COLORS: Record<number, string> = {
  1: '#16a34a',
  2: '#2563eb',
  3: '#d97706',
  4: '#7c3aed',
  5: '#dc2626',
};

type Section = {
  phase: number;
  phaseName: string;
  data: TrainingWeek[];
};

function groupByPhase(plan: TrainingWeek[]): Section[] {
  const map = new Map<string, Section>();
  for (const week of plan) {
    const key = `${week.phase}-${week.phaseName}`;
    if (!map.has(key)) {
      map.set(key, { phase: week.phase, phaseName: week.phaseName, data: [] });
    }
    map.get(key)!.data.push(week);
  }
  return Array.from(map.values());
}

export default function PlanScreen() {
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [log, setLog] = useState<WorkoutLog>({});
  const [refreshing, setRefreshing] = useState(false);
  const [calExporting, setCalExporting] = useState(false);

  const load = useCallback(async () => {
    const [pl, wl] = await Promise.all([loadTrainingPlan(), loadWorkoutLog()]);
    if (pl) setPlan(pl);
    setLog(wl);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function handleExportCalendar() {
    if (plan.length === 0) return;
    setCalExporting(true);
    try {
      const count = await exportPlanToCalendar(plan);
      Alert.alert('Calendar Export Complete', `Added ${count} workouts to your calendar (Apple or Google, whichever is set as default on your device).`);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message ?? 'Could not export to calendar.');
    } finally {
      setCalExporting(false);
    }
  }

  const sections = groupByPhase(plan);

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      sections={sections}
      keyExtractor={(item: TrainingWeek) => item.startDate}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }: { section: { phase: number; phaseName: string; data: TrainingWeek[] } }) => (
        <View style={[styles.sectionHeader, { backgroundColor: PHASE_COLORS[section.phase] + '22' }]}>
          <View style={[styles.phaseBar, { backgroundColor: PHASE_COLORS[section.phase] }]} />
          <Text style={[styles.phaseName, { color: PHASE_COLORS[section.phase] }]}>
            {section.phaseName}
          </Text>
        </View>
      )}
      renderItem={({ item: week }: { item: TrainingWeek }) => (
        <WeekBlock week={week} log={log} />
      )}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text variant="headlineSmall" style={styles.title}>Training Plan</Text>
          <Text variant="bodySmall" style={styles.subtitle}>30 weeks · Wine & Dine → Dopey Challenge</Text>
          <Button
            mode="outlined"
            icon="calendar-export"
            onPress={handleExportCalendar}
            loading={calExporting}
            disabled={calExporting || plan.length === 0}
            style={styles.calBtn}
          >
            Export to Calendar
          </Button>
        </View>
      }
    />
  );
}

function WeekBlock({ week, log }: { week: TrainingWeek; log: WorkoutLog }) {
  const isCurrentWeek = week.startDate <= TODAY && TODAY <= format(parseISO(week.startDate), 'yyyy-MM-dd');
  const weekEnd = new Date(parseISO(week.startDate));
  weekEnd.setDate(weekEnd.getDate() + 6);
  const isPast = weekEnd < new Date(TODAY);

  return (
    <Surface style={[styles.weekCard, isCurrentWeek && styles.currentWeek]} elevation={1}>
      <View style={styles.weekHeader}>
        <Text variant="labelLarge" style={styles.weekNum}>
          Week {week.weekNumber}
        </Text>
        <Text variant="bodySmall" style={styles.weekDates}>
          {format(parseISO(week.startDate), 'MMM d')} – {format(weekEnd, 'MMM d')}
        </Text>
        {isCurrentWeek && (
          <Chip style={styles.currentChip} textStyle={styles.currentChipText}>Current</Chip>
        )}
        {week.isTaper && (
          <Chip style={styles.taperChip} textStyle={styles.taperChipText}>Taper</Chip>
        )}
      </View>
      <Divider style={styles.weekDivider} />
      {week.workouts.map(w => (
        <WorkoutCard
          key={w.id}
          workout={w}
          logEntry={log[w.date]}
          compact
        />
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { paddingBottom: 32 },
  listHeader: { padding: 16, paddingTop: 56 },
  title: { fontWeight: '800', color: '#1e40af' },
  subtitle: { color: '#6b7280', marginTop: 4, marginBottom: 10 },
  calBtn: { alignSelf: 'flex-start', borderColor: '#1e40af' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  phaseBar: { width: 4, height: 20, borderRadius: 2 },
  phaseName: { fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  weekCard: {
    margin: 12,
    marginTop: 4,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
  },
  currentWeek: {
    borderWidth: 2,
    borderColor: '#1e40af',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  weekNum: { fontWeight: '700', color: '#1e40af' },
  weekDates: { color: '#6b7280', flex: 1 },
  currentChip: { backgroundColor: '#1e40af' },
  currentChipText: { color: '#fff', fontSize: 10 },
  taperChip: { backgroundColor: '#fef3c7' },
  taperChipText: { color: '#92400e', fontSize: 10 },
  weekDivider: { marginVertical: 10 },
});
