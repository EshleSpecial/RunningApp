import { format, parseISO } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, Surface, Text } from 'react-native-paper';
import WorkoutCard from '../../components/WorkoutCard';
import { loadTrainingPlan, loadWorkoutLog, loadUserProfile } from '../../lib/storage';
import { exportPlanToCalendar } from '../../lib/calendar';
import { useTheme } from '../../constants/theme';
import type { Race, TrainingWeek, UserProfile, WorkoutLog } from '../../types';

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

function raceSubtitle(races: Race[]): string {
  if (races.length === 0) return 'No races added yet';
  if (races.length === 1) return races[0].name;
  if (races.length === 2) return `${races[0].name} → ${races[1].name}`;
  return `${races[0].name} + ${races.length - 1} more`;
}

export default function PlanScreen() {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [log, setLog] = useState<WorkoutLog>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calExporting, setCalExporting] = useState(false);

  const load = useCallback(async () => {
    const [pl, wl, p] = await Promise.all([loadTrainingPlan(), loadWorkoutLog(), loadUserProfile()]);
    if (pl) setPlan(pl);
    setLog(wl);
    if (p) setProfile(p);
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
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      sections={sections}
      keyExtractor={(item: TrainingWeek) => item.startDate}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }: { section: { phase: number; phaseName: string; data: TrainingWeek[] } }) => (
        <View style={[styles.sectionHeader, { backgroundColor: '#0a1220' }]}>
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
          <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>Training Plan</Text>
          <Text variant="bodySmall" style={[styles.subtitle, { color: colors.accent }]}>
            {plan.length} week{plan.length !== 1 ? 's' : ''} · {raceSubtitle(profile?.races ?? [])}
          </Text>
          <Button
            mode="outlined"
            icon="calendar-export"
            onPress={handleExportCalendar}
            loading={calExporting}
            disabled={calExporting || plan.length === 0}
            style={[styles.calBtn, { borderColor: colors.primary }]}
          >
            Export to Calendar
          </Button>
        </View>
      }
    />
  );
}

function WeekBlock({ week, log }: { week: TrainingWeek; log: WorkoutLog }) {
  const { colors } = useTheme();
  const isCurrentWeek = week.startDate <= TODAY && TODAY <= format(parseISO(week.startDate), 'yyyy-MM-dd');
  const weekEnd = new Date(parseISO(week.startDate));
  weekEnd.setDate(weekEnd.getDate() + 6);
  const isPast = weekEnd < new Date(TODAY);

  return (
    <Surface
      style={[
        styles.weekCard,
        { backgroundColor: colors.surface },
        isCurrentWeek && { borderWidth: 2, borderColor: colors.primary },
      ]}
      elevation={1}
    >
      <View style={styles.weekHeader}>
        <Text variant="labelLarge" style={[styles.weekNum, { color: colors.primary }]}>
          Week {week.weekNumber}
        </Text>
        <Text variant="bodySmall" style={[styles.weekDates, { color: colors.textSecondary }]}>
          {format(parseISO(week.startDate), 'MMM d')} – {format(weekEnd, 'MMM d')}
        </Text>
        {isCurrentWeek && (
          <Chip style={[styles.currentChip, { backgroundColor: colors.primary }]} textStyle={[styles.currentChipText, { color: colors.surface }]}>Current</Chip>
        )}
        {week.isTaper && (
          <Chip style={[styles.taperChip, { backgroundColor: colors.warning + '22' }]} textStyle={[styles.taperChipText, { color: colors.warning }]}>Taper</Chip>
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
  screen: { flex: 1 },
  content: { paddingBottom: 32 },
  listHeader: { padding: 16, paddingTop: 56 },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 4, marginBottom: 10 },
  calBtn: { alignSelf: 'flex-start' },
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
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  weekNum: { fontWeight: '700' },
  weekDates: { flex: 1 },
  currentChip: {},
  currentChipText: { fontSize: 10 },
  taperChip: {},
  taperChipText: { fontSize: 10 },
  weekDivider: { marginVertical: 10 },
});
