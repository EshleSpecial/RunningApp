import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Divider } from 'react-native-paper';
import type { PTExercise } from '../types';

interface Props {
  exercise: PTExercise;
  completed: boolean;
  onToggle: () => void;
}

export default function PTExerciseCard({ exercise, completed, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);

  const setsReps = exercise.duration
    ? `${exercise.sets} sets × ${exercise.duration} each side`
    : `${exercise.sets} sets × ${exercise.reps} reps each side`;

  return (
    <Card
      style={[styles.card, completed && styles.completedCard]}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text variant="titleSmall" style={[styles.name, completed && styles.completedName]}>
              {exercise.name}
            </Text>
            <Text variant="bodySmall" style={styles.setsReps}>
              {setsReps}
            </Text>
          </View>
          <View style={styles.actions}>
            <IconButton
              icon={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              onPress={() => setExpanded(v => !v)}
            />
            <IconButton
              icon={completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={26}
              iconColor={completed ? '#16a34a' : '#9ca3af'}
              onPress={onToggle}
            />
          </View>
        </View>

        {expanded && (
          <View style={styles.detail}>
            <Divider style={styles.divider} />
            <Text variant="bodySmall" style={styles.description}>
              {exercise.description}
            </Text>
            <View style={styles.tipBox}>
              <Text variant="bodySmall" style={styles.tipLabel}>
                💡 PT Tip
              </Text>
              <Text variant="bodySmall" style={styles.tipText}>
                {exercise.tip}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 5,
    borderRadius: 10,
  },
  completedCard: {
    opacity: 0.55,
    backgroundColor: '#f0fdf4',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    color: '#1e40af',
  },
  completedName: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  setsReps: {
    color: '#7c3aed',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detail: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 8,
  },
  description: {
    color: '#374151',
    lineHeight: 18,
  },
  tipBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  tipLabel: {
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 3,
  },
  tipText: {
    color: '#1e3a8a',
    lineHeight: 17,
  },
});
