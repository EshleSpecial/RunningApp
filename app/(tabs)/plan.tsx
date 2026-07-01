import { format, parseISO } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Chip, Divider, Surface, Text } from 'react-native-paper';
import WorkoutCard from '../../components/WorkoutCard';
import { loadTrainingPlan, loadWorkoutLog, loadUserProfile, patchWorkoutLogEntry } from '../../lib/storage';
import { exportPlanToCalendar } from '../../lib/calendar';
import { useTheme } from '../../constants/theme';
import type { Race, TrainingWeek, UserProfile, Workout, WorkoutLog } from '../../types';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const PHASE_COLORS: Record<number, string> = {
  1: '#16a34a',
  2: '#2563eb',
  3: '#d97706',
  4: '#7c3aed',
  5: '#dc2626',
};

const WORKOUT_LABELS: Record<string, string> = {
  easy_run: 'Easy Run',
  long_run: 'Long Run',
  interval_run: 'Interval Run',
  tempo_run: 'Tempo Run',
  fartlek: 'Fartlek',
  hill_run: 'Hill Run',
  cross_train: 'Cross-Train',
  pt_only: 'Recovery Session',
  rest: 'Rest Day',
  race: 'Race Day',
};

const GALLOWAY: Partial<Record<string, string>> = {
  easy_run: 'Run 3 min / Walk 1 min',
  long_run: 'Run 3 min / Walk 1 min',
  interval_run: 'Run 1 min hard / Walk 2 min recovery',
  tempo_run: 'Run 5 min / Walk 1 min',
  fartlek: 'Run 5 min / Walk 1 min',
  hill_run: 'Run uphill / Walk down to recover',
  race: 'Run 4 min / Walk 1 min',
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
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<{ name: string; phase: number } | null>(null);

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

  async function handleMarkComplete(workout: Workout) {
    const updated = await patchWorkoutLogEntry(workout.date, { completed: true });
    setLog(updated);
    setSelectedWorkout(null);
  }

  const sections = groupByPhase(plan);

  return (
    <>
      <SectionList
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        sections={sections}
        keyExtractor={(item: TrainingWeek) => item.startDate}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }: { section: { phase: number; phaseName: string; data: TrainingWeek[] } }) => (
          <TouchableOpacity
            style={[styles.sectionHeader, { backgroundColor: '#0a1220' }]}
            onPress={() => setSelectedPhase({ name: section.phaseName, phase: section.phase })}
            activeOpacity={0.7}
          >
            <View style={[styles.phaseBar, { backgroundColor: PHASE_COLORS[section.phase] }]} />
            <Text style={[styles.phaseName, { color: PHASE_COLORS[section.phase], flex: 1 }]}>
              {section.phaseName}
            </Text>
            <View style={[styles.phaseInfoIcon, { borderColor: colors.textSecondary }]}>
              <Text style={[styles.phaseInfoIconText, { color: colors.textSecondary }]}>i</Text>
            </View>
          </TouchableOpacity>
        )}
        renderItem={({ item: week }: { item: TrainingWeek }) => (
          <WeekBlock week={week} log={log} onSelectWorkout={setSelectedWorkout} />
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.textPrimary }]}>Training Plan</Text>
            <Text variant="bodySmall" style={[styles.subtitle, { color: colors.accent }]}>
              {plan.length} week{plan.length !== 1 ? 's' : ''} · {raceSubtitle(profile?.races ?? [])}
            </Text>
            <Button
              mode="outlined"
              icon="calendar-export"
              onPress={handleExportCalendar}
              loading={calExporting}
              disabled={calExporting || plan.length === 0}
              style={[styles.calBtn, { borderColor: colors.accent }]}
              textColor={colors.accent}
            >
              Export to Calendar
            </Button>
          </View>
        }
      />

      <WorkoutDetailModal
        workout={selectedWorkout}
        log={log}
        onClose={() => setSelectedWorkout(null)}
        onMarkComplete={handleMarkComplete}
      />

      <PhaseInfoModal
        phase={selectedPhase}
        onClose={() => setSelectedPhase(null)}
      />
    </>
  );
}

function getPhaseInfo(phaseName: string): { description: string; tip: string } {
  if (phaseName === 'Foundation') {
    return {
      description: 'This is where your training begins. The goal is to build a consistent aerobic base with easy, conversational runs. No hard efforts yet — just time on your feet. These weeks teach your body to adapt to regular training and reduce injury risk before the harder work begins.',
      tip: 'Keep every run at a pace where you can hold a full conversation. If you cannot, slow down.',
    };
  }
  if (phaseName === 'Base Build') {
    return {
      description: 'Your mileage and long run are growing steadily. This phase develops your aerobic engine — the foundation that every other type of training depends on. You will notice interval and fartlek workouts appearing mid-week. These introduce speed in a controlled way while your long runs continue building endurance.',
      tip: 'Do your hard workouts hard and your easy runs easy. Most runners make the mistake of doing everything at medium effort.',
    };
  }
  if (phaseName.includes('Taper') || phaseName.includes('Race Week') === false && phaseName.toLowerCase().includes('taper')) {
    if (phaseName.includes('Race Week')) {
      return {
        description: 'Race week is here. Your training is done — nothing you do this week will make you fitter, but poor decisions can make you slower. Keep runs short and easy, stay off your feet as much as possible, eat well, hydrate, and trust every mile you have logged to get here.',
        tip: 'Lay out all your gear the night before. Know your start time, parking, and bag check details.',
      };
    }
    return {
      description: 'Your body needs time to absorb all the training you have done and arrive at the start line fresh and ready. Taper weeks reduce your mileage while keeping some intensity so your legs stay sharp. Trust the process — feeling restless or sluggish during taper is completely normal and a sign the training is working.',
      tip: 'Avoid the temptation to cram in extra miles. The hay is in the barn.',
    };
  }
  if (phaseName.includes('Race Week')) {
    return {
      description: 'Race week is here. Your training is done — nothing you do this week will make you fitter, but poor decisions can make you slower. Keep runs short and easy, stay off your feet as much as possible, eat well, hydrate, and trust every mile you have logged to get here.',
      tip: 'Lay out all your gear the night before. Know your start time, parking, and bag check details.',
    };
  }
  if (phaseName.includes('Prep')) {
    return {
      description: 'These weeks are race-specific preparation. Your long runs are at their peak and workouts are dialed in to match your race demands. Terrain, pace, and back-to-back efforts simulate what race day will feel like. Stay consistent, sleep well, and fuel properly.',
      tip: 'Practice your race-day nutrition and gear on your long runs. Race day is not the time to try anything new.',
    };
  }
  if (phaseName === 'Recovery & Rebuild' || phaseName.includes('Recovery')) {
    return {
      description: 'After a race your body needs genuine recovery before it can absorb new training. These weeks have reduced intensity and volume by design. Easy runs flush out fatigue while your connective tissue and muscles repair. Resist the urge to push — this phase makes the next one possible.',
      tip: 'Sleep is your most powerful recovery tool this phase. Prioritize it over extra easy miles.',
    };
  }
  if (phaseName === 'Maintenance') {
    return {
      description: 'You are between training blocks. These weeks keep your aerobic base intact with consistent easy running so you do not lose fitness. When your next race cycle begins you will be ready to build from a strong base rather than starting over.',
      tip: 'Consistency beats perfection every time.',
    };
  }
  return {
    description: 'This phase of your training has a specific purpose in your overall plan. Each week builds on the last — trust the process and focus on consistency over perfection.',
    tip: 'Consistency beats perfection every time.',
  };
}

function PhaseInfoModal({
  phase,
  onClose,
}: {
  phase: { name: string; phase: number } | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  if (!phase) return null;

  const phaseColor = PHASE_COLORS[phase.phase] ?? colors.accent;
  const { description, tip } = getPhaseInfo(phase.name);

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Text style={[modalStyles.closeBtnText, { color: colors.textPrimary }]}>✕</Text>
          </TouchableOpacity>

          <Text style={[phaseModalStyles.title, { color: colors.textPrimary }]}>{phase.name}</Text>
          <View style={[phaseModalStyles.accentBar, { backgroundColor: phaseColor }]} />

          <Text style={[phaseModalStyles.description, { color: colors.textPrimary }]}>{description}</Text>

          <View style={[phaseModalStyles.tipBox, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.accent }]}>
            <Text style={[phaseModalStyles.tipText, { color: colors.textPrimary }]}>{tip}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function WorkoutDetailModal({
  workout,
  log,
  onClose,
  onMarkComplete,
}: {
  workout: Workout | null;
  log: WorkoutLog;
  onClose: () => void;
  onMarkComplete: (w: Workout) => void;
}) {
  const { colors } = useTheme();
  if (!workout) return null;

  const wColors = colors.workoutColors[workout.type as keyof typeof colors.workoutColors] ?? {
    pillBg: colors.surface,
    pillText: colors.textPrimary,
  };
  const label = WORKOUT_LABELS[workout.type] ?? workout.type;
  const galloway = GALLOWAY[workout.type];
  const isCompleted = log[workout.date]?.completed === true;
  const showGalloway = workout.type !== 'rest' && workout.type !== 'pt_only' && workout.type !== 'cross_train';

  let dateLabel = '';
  try {
    dateLabel = format(parseISO(workout.date), 'EEEE, MMMM d');
  } catch {
    dateLabel = workout.date;
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          {/* Close button */}
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Text style={[modalStyles.closeBtnText, { color: colors.textPrimary }]}>✕</Text>
          </TouchableOpacity>

          {/* Workout type pill */}
          <View style={[modalStyles.pill, { backgroundColor: wColors.pillBg }]}>
            <Text style={[modalStyles.pillText, { color: wColors.pillText }]}>{label}</Text>
          </View>

          {/* Date */}
          <Text style={[modalStyles.dateText, { color: colors.textSecondary }]}>{dateLabel}</Text>

          {/* Distance or duration */}
          {workout.distanceMiles != null ? (
            <Text style={[modalStyles.metric, { color: colors.accent }]}>
              {workout.distanceMiles} miles
            </Text>
          ) : workout.durationMins != null ? (
            <Text style={[modalStyles.metric, { color: colors.accent }]}>
              {workout.durationMins} min
            </Text>
          ) : null}

          {/* Notes */}
          {!!workout.notes && (
            <Text style={[modalStyles.notes, { color: colors.textPrimary }]}>{workout.notes}</Text>
          )}

          {/* Galloway section */}
          {showGalloway && galloway && (
            <>
              <View style={[modalStyles.divider, { backgroundColor: colors.border }]} />
              <Text style={[modalStyles.gallowaySectionLabel, { color: colors.textSecondary }]}>
                Galloway run/walk option
              </Text>
              <Text style={[modalStyles.gallowayText, { color: colors.textPrimary }]}>{galloway}</Text>
            </>
          )}

          {/* Divider before action */}
          <View style={[modalStyles.divider, { backgroundColor: colors.border }]} />

          {/* Mark complete / completed badge */}
          {isCompleted ? (
            <View style={modalStyles.completedBadge}>
              <Text style={[modalStyles.completedText, { color: colors.success }]}>✓ Completed</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[modalStyles.completeBtn, { backgroundColor: colors.accent }]}
              onPress={() => onMarkComplete(workout)}
            >
              <Text style={modalStyles.completeBtnText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function WeekBlock({
  week,
  log,
  onSelectWorkout,
}: {
  week: TrainingWeek;
  log: WorkoutLog;
  onSelectWorkout: (w: Workout) => void;
}) {
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
        <Text variant="labelLarge" style={[styles.weekNum, { color: colors.textPrimary }]}>
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
        <TouchableOpacity key={w.id} onPress={() => onSelectWorkout(w)} activeOpacity={0.75}>
          <WorkoutCard
            workout={w}
            logEntry={log[w.date]}
            compact
          />
        </TouchableOpacity>
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
  phaseInfoIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseInfoIconText: { fontSize: 11, fontWeight: '700', lineHeight: 14 },
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    marginTop: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 13,
    marginBottom: 8,
  },
  metric: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  notes: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  gallowaySectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  gallowayText: {
    fontSize: 14,
    lineHeight: 21,
  },
  completeBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  completedBadge: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

const phaseModalStyles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 10,
    paddingRight: 32,
  },
  accentBar: {
    height: 3,
    borderRadius: 2,
    width: 48,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  tipBox: {
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
