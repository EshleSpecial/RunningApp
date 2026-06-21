import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Button, Text } from 'react-native-paper';
import { calculateFueling, getTreadmillSettings } from '../lib/fueling';
import PostRunLogger from './PostRunLogger';
import type { Workout, WorkoutLogEntry } from '../types';

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  easy_run:    { label: 'Easy Run',    color: '#16a34a', emoji: '🏃' },
  long_run:    { label: 'Long Run',    color: '#2563eb', emoji: '🏃' },
  cross_train: { label: 'Cross-Train', color: '#d97706', emoji: '🚴' },
  pt_only:     { label: 'Hip PT',      color: '#7c3aed', emoji: '💪' },
  rest:        { label: 'Rest Day',    color: '#6b7280', emoji: '😴' },
  race:        { label: 'RACE DAY',    color: '#dc2626', emoji: '🏅' },
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
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [cooldownOpen, setCooldownOpen] = useState(false);

  const config = TYPE_CONFIG[workout.type] ?? TYPE_CONFIG.rest;
  const completed = logEntry?.completed ?? false;
  const swapped = logEntry?.swappedToCrossTraining ?? false;

  const displayLabel = swapped ? 'Cross-Train (swapped)' : config.label;
  const displayEmoji = swapped ? '🚴' : config.emoji;

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
      style={[styles.card, { borderLeftColor: config.color, opacity: completed ? 0.6 : 1 }]}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.emoji}>{displayEmoji}</Text>
            <View>
              <Text variant="titleMedium" style={{ color: config.color, fontWeight: '700' }}>
                {displayLabel}
              </Text>
              {subtitleParts.length > 0 && (
                <Text variant="bodySmall" style={styles.subtitle}>
                  {subtitleParts.join('  ·  ')}
                </Text>
              )}
            </View>
          </View>
          {completed && (
            <Chip icon="check-circle" style={styles.doneChip} textStyle={styles.doneText}>
              Done
            </Chip>
          )}
        </View>

        {!compact && (
          <>
            <Text variant="bodySmall" style={styles.notes}>{workout.notes}</Text>

            {/* Treadmill settings */}
            {treadmill && (
              <View style={styles.treadmillBox}>
                <Text style={styles.treadmillText}>
                  🏃 Treadmill: {treadmill.speedMph} mph · {treadmill.inclinePct}% incline
                </Text>
              </View>
            )}

            {/* Fueling plan */}
            {fuelingPlan && (
              <View style={styles.fuelingBox}>
                <Text style={styles.fuelingTitle}>
                  🍯 Fueling: {fuelingPlan.gelsNeeded} gel{fuelingPlan.gelsNeeded !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.fuelingDetail}>
                  Take at: {fuelingPlan.gelScheduleMin.map(m => `${m} min`).join(', ')}
                  {'\n'}
                  Water: ~{fuelingPlan.waterOzPerHour} oz/hr · Est. {fuelingPlan.estimatedTimeMin} min on feet
                </Text>
              </View>
            )}

            {/* Warmup accordion */}
            {isRunType && (
              <View style={styles.accordionSection}>
                <TouchableOpacity
                  onPress={() => setWarmupOpen(v => !v)}
                  style={styles.accordionHeader}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accordionTitle}>🔥 Warmup</Text>
                  <Text style={styles.accordionChevron}>{warmupOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {warmupOpen && (
                  <View style={styles.accordionBody}>
                    {WARMUP_STEPS.map((step, i) => (
                      <Text key={i} style={styles.accordionItem}>• {step}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Cooldown & rollout accordion */}
            {isRunType && (
              <View style={styles.accordionSection}>
                <TouchableOpacity
                  onPress={() => setCooldownOpen(v => !v)}
                  style={styles.accordionHeader}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accordionTitle}>🧘 Cooldown & Rollout</Text>
                  <Text style={styles.accordionChevron}>{cooldownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {cooldownOpen && (
                  <View style={styles.accordionBody}>
                    <Text style={styles.accordionSubheader}>Cooldown</Text>
                    {COOLDOWN_STEPS.map((step, i) => (
                      <Text key={i} style={styles.accordionItem}>• {step}</Text>
                    ))}
                    <Text style={[styles.accordionSubheader, { marginTop: 10 }]}>Foam Roll</Text>
                    {ROLLOUT_STEPS.map((step, i) => (
                      <Text key={i} style={styles.accordionItem}>• {step}</Text>
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
              style={styles.swapBtn}
              labelStyle={{ fontSize: 12 }}
            >
              Swap to Cross-Train
            </Button>
          )}
          <Button mode="contained" onPress={onComplete} style={{ backgroundColor: config.color }}>
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
  emoji: {
    fontSize: 22,
    marginRight: 4,
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 1,
  },
  notes: {
    marginTop: 8,
    color: '#374151',
    lineHeight: 18,
  },
  treadmillBox: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  treadmillText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600',
  },
  fuelingBox: {
    marginTop: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  fuelingTitle: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  fuelingDetail: {
    color: '#78350f',
    fontSize: 12,
    lineHeight: 17,
  },
  accordionSection: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#f9fafb',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  accordionChevron: {
    fontSize: 10,
    color: '#9ca3af',
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  accordionSubheader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accordionItem: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 20,
  },
  doneChip: {
    backgroundColor: '#d1fae5',
  },
  doneText: {
    color: '#065f46',
    fontSize: 11,
  },
  swapBtn: {
    borderColor: '#d97706',
  },
});
