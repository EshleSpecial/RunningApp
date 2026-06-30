import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Button, Text } from 'react-native-paper';
import { format, parseISO } from 'date-fns';
import { calculateFueling, getTreadmillSettings } from '../lib/fueling';
import PostRunLogger from './PostRunLogger';
import { useTheme } from '../constants/theme';
import type { Workout, WorkoutLogEntry } from '../types';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  easy_run:     { label: 'Easy Run',          color: '#16a34a' },
  long_run:     { label: 'Long Run',           color: '#2563eb' },
  interval_run: { label: 'Intervals',          color: '#f43f5e' },
  tempo_run:    { label: 'Tempo Run',          color: '#f43f5e' },
  fartlek:      { label: 'Fartlek',            color: '#a855f7' },
  hill_run:     { label: 'Hill Repeats',       color: '#f97316' },
  cross_train:  { label: 'Cross-Train',        color: '#d97706' },
  pt_only:      { label: 'Injury & Recovery',  color: '#7c3aed' },
  rest:         { label: 'Rest Day',           color: '#6b7280' },
  race:         { label: 'RACE DAY',           color: '#dc2626' },
};

const WARMUP_STEPS = [
  '2 min brisk walk',
  'Leg swings forward & back — 10 each leg',
  'Lateral leg swings — 10 each leg',
  'Hip circles — 10 each direction',
  'High knees — 30 seconds',
  'Butt kicks — 30 seconds',
];

const COOLDOWN_STEPS = [
  '3 min easy walk',
  'Standing quad stretch — 30 sec each leg',
  'Hip flexor lunge stretch — 30 sec each leg',
  'Standing calf stretch — 30 sec each leg',
  'IT band cross stretch — 30 sec each leg',
  'Seated hamstring stretch — 30 sec each leg',
];

const ROLLOUT_STEPS = [
  'Calves — 60 sec each leg',
  'IT band (outer thigh) — 60 sec each leg',
  'Glutes/piriformis (figure-4) — 60 sec each side',
  'Hip flexors — 60 sec each side',
  'Quads — 60 sec each leg',
  'Upper back (thoracic spine) — 60 sec',
];

interface Props {
  workout: Workout;
  logEntry?: WorkoutLogEntry;
  onComplete?: () => void;
  onSwapCrossTraining?: () => void;
  onSaveRunData?: (date: string, pace?: number, gels?: number) => void;
  showSwap?: boolean;
  compact?: boolean;
  paceMinPerMile?: number;
  prefersTreadmill?: boolean;
}

export default function WorkoutCard({
  workout,
  logEntry,
  onComplete,
  onSwapCrossTraining,
  onSaveRunData,
  showSwap = false,
  compact = false,
  paceMinPerMile,
  prefersTreadmill = false,
}: Props) {
  const { colors } = useTheme();
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [cooldownOpen, setCooldownOpen] = useState(false);

  const config = TYPE_CONFIG[workout.type] ?? TYPE_CONFIG.rest;
  const wc = colors.workoutColors[workout.type as keyof typeof colors.workoutColors] ?? colors.workoutColors.rest;
  const completed = logEntry?.completed ?? false;
  const swapped = logEntry?.swappedToCrossTraining ?? false;

  const displayLabel = swapped ? 'Cross-Train (swapped)' : config.label;

  const subtitleParts: string[] = [];
  if (workout.distanceMiles) subtitleParts.push(`${workout.distanceMiles} mi`);
  if (workout.durationMins) subtitleParts.push(`${workout.durationMins} min`);

  const isRunType = workout.type === 'easy_run' || workout.type === 'long_run';
  const showTreadmill = prefersTreadmill && paceMinPerMile && isRunType;
  const treadmill = showTreadmill ? getTreadmillSettings(workout.type, paceMinPerMile!) : null;
  const fuelingPlan = paceMinPerMile && workout.distanceMiles
    ? calculateFueling(workout.distanceMiles, paceMinPerMile)
    : null;

  return (
    <Card
      style={[styles.card, { borderLeftColor: wc.accent, opacity: completed ? 0.6 : 1, backgroundColor: colors.surface }]}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                {format(parseISO(workout.date), 'EEEE')}
              </Text>
              <Text variant="titleMedium" style={{ color: wc.accent, fontWeight: '700' }}>
                {displayLabel}
              </Text>
              {subtitleParts.length > 0 && (
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 1 }}>
                  {subtitleParts.join('  ·  ')}
                </Text>
              )}
            </View>
          </View>
          {completed && (
            <View style={[styles.doneChip, { backgroundColor: colors.success + '33' }]}>
              <Text style={[styles.doneText, { color: colors.success }]}>✓ Done</Text>
            </View>
          )}
        </View>

        {!compact && (
          <>
            <Text variant="bodySmall" style={[styles.notes, { color: colors.textPrimary }]}>{workout.notes}</Text>

            {/* Treadmill settings */}
            {treadmill && (
              <View style={[styles.treadmillBox, { backgroundColor: colors.success + '18' }]}>
                <Text style={[styles.treadmillText, { color: colors.success }]}>
                  Treadmill: {treadmill.speedMph} mph · {treadmill.inclinePct}% incline
                </Text>
              </View>
            )}

            {/* Fueling plan */}
            {fuelingPlan && (
              <View style={[styles.fuelingBox, { backgroundColor: colors.warning + '18', borderLeftColor: colors.warning }]}>
                <Text style={[styles.fuelingTitle, { color: colors.warning }]}>
                  Fueling: {fuelingPlan.gelsNeeded} gel{fuelingPlan.gelsNeeded !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.fuelingDetail, { color: colors.textPrimary }]}>
                  Take at: {fuelingPlan.gelScheduleMin.map(m => `${m} min`).join(', ')}
                  {'\n'}
                  Water: ~{fuelingPlan.waterOzPerHour} oz/hr · Est. {fuelingPlan.estimatedTimeMin} min on feet
                </Text>
              </View>
            )}

            {/* Warmup accordion */}
            {isRunType && (
              <View style={[styles.accordionSection, { borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setWarmupOpen(v => !v)}
                  style={[styles.accordionHeader, { backgroundColor: colors.surfaceAlt }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>Warmup</Text>
                  <Text style={[styles.accordionChevron, { color: colors.textSecondary }]}>{warmupOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {warmupOpen && (
                  <View style={[styles.accordionBody, { backgroundColor: colors.surface }]}>
                    {WARMUP_STEPS.map((step, i) => (
                      <Text key={i} style={[styles.accordionItem, { color: colors.textPrimary }]}>• {step}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Cooldown & rollout accordion */}
            {isRunType && (
              <View style={[styles.accordionSection, { borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setCooldownOpen(v => !v)}
                  style={[styles.accordionHeader, { backgroundColor: colors.surfaceAlt }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>Cooldown & Rollout</Text>
                  <Text style={[styles.accordionChevron, { color: colors.textSecondary }]}>{cooldownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {cooldownOpen && (
                  <View style={[styles.accordionBody, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.accordionSubheader, { color: colors.textSecondary }]}>Cooldown</Text>
                    {COOLDOWN_STEPS.map((step, i) => (
                      <Text key={i} style={[styles.accordionItem, { color: colors.textPrimary }]}>• {step}</Text>
                    ))}
                    <Text style={[styles.accordionSubheader, { color: colors.textSecondary, marginTop: 10 }]}>Foam Roll</Text>
                    {ROLLOUT_STEPS.map((step, i) => (
                      <Text key={i} style={[styles.accordionItem, { color: colors.textPrimary }]}>• {step}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Post-run logger — pace & gel tracking */}
            {completed && isRunType && onSaveRunData && (
              <PostRunLogger
                workoutDate={workout.date}
                logEntry={logEntry}
                onSave={onSaveRunData}
              />
            )}
          </>
        )}
      </Card.Content>

      {!compact && !completed && onComplete && (
        <Card.Actions>
          {showSwap && onSwapCrossTraining && workout.type !== 'rest' && workout.type !== 'pt_only' && (
            <Button
              mode="outlined"
              onPress={onSwapCrossTraining}
              style={[styles.swapBtn, { borderColor: colors.warning }]}
              labelStyle={{ fontSize: 12 }}
            >
              Swap to Cross-Train
            </Button>
          )}
          <Button mode="contained" onPress={onComplete} style={{ backgroundColor: wc.accent }}>
            Mark Complete
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    borderLeftWidth: 5,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dayLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  notes: { marginTop: 8, lineHeight: 18 },
  treadmillBox: {
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  treadmillText: { fontSize: 13, fontWeight: '600' },
  fuelingBox: {
    marginTop: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
  },
  fuelingTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  fuelingDetail: { fontSize: 12, lineHeight: 17 },
  accordionSection: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  accordionTitle: { fontSize: 13, fontWeight: '600' },
  accordionChevron: { fontSize: 10 },
  accordionBody: { paddingHorizontal: 12, paddingVertical: 10 },
  accordionSubheader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accordionItem: { fontSize: 12, lineHeight: 20 },
  doneChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneText: { fontSize: 11, fontWeight: '700' },
  swapBtn: {},
});
