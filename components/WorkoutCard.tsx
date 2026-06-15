import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';
import type { Workout, WorkoutLogEntry } from '../types';

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  easy_run:    { label: 'Easy Run',      color: '#16a34a', emoji: '🏃' },
  long_run:    { label: 'Long Run',      color: '#2563eb', emoji: '🏃' },
  cross_train: { label: 'Cross-Train',   color: '#d97706', emoji: '🚴' },
  pt_only:     { label: 'Hip PT',        color: '#7c3aed', emoji: '💪' },
  rest:        { label: 'Rest Day',      color: '#6b7280', emoji: '😴' },
  race:        { label: 'RACE DAY',      color: '#dc2626', emoji: '🏅' },
};

interface Props {
  workout: Workout;
  logEntry?: WorkoutLogEntry;
  onComplete?: () => void;
  onSwapCrossTraining?: () => void;
  showSwap?: boolean;
  compact?: boolean;
}

export default function WorkoutCard({
  workout,
  logEntry,
  onComplete,
  onSwapCrossTraining,
  showSwap = false,
  compact = false,
}: Props) {
  const config = TYPE_CONFIG[workout.type] ?? TYPE_CONFIG.rest;
  const completed = logEntry?.completed ?? false;
  const swapped = logEntry?.swappedToCrossTraining ?? false;

  const displayLabel = swapped ? 'Cross-Train (swapped)' : config.label;
  const displayEmoji = swapped ? '🚴' : config.emoji;

  const subtitleParts: string[] = [];
  if (workout.distanceMiles) subtitleParts.push(`${workout.distanceMiles} mi`);
  if (workout.durationMins) subtitleParts.push(`${workout.durationMins} min`);

  return (
    <Card
      style={[
        styles.card,
        { borderLeftColor: config.color, opacity: completed ? 0.6 : 1 },
      ]}
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
          <Text variant="bodySmall" style={styles.notes}>
            {workout.notes}
          </Text>
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
