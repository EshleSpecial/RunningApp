import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Divider } from 'react-native-paper';
import { useTheme } from '../constants/theme';
import type { PTExercise } from '../types';

interface Props {
  exercise: PTExercise;
  completed: boolean;
  onToggle: () => void;
}

export default function PTExerciseCard({ exercise, completed, onToggle }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const setsReps = exercise.duration
    ? `${exercise.sets} sets × ${exercise.duration} each side`
    : `${exercise.sets} sets × ${exercise.reps} reps each side`;

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface, opacity: completed ? 0.55 : 1 }]}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text
              variant="titleSmall"
              style={[
                styles.name,
                { color: completed ? colors.text + '88' : colors.primary },
                completed && styles.completedName,
              ]}
            >
              {exercise.name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.primary + 'cc', marginTop: 2 }}>
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
              iconColor={completed ? colors.success : colors.text + '55'}
              onPress={onToggle}
            />
          </View>
        </View>

        {expanded && (
          <View style={styles.detail}>
            <Divider style={styles.divider} />
            <Text variant="bodySmall" style={[styles.description, { color: colors.text }]}>
              {exercise.description}
            </Text>
            <View style={[styles.tipBox, { backgroundColor: colors.primary + '11' }]}>
              <Text variant="bodySmall" style={[styles.tipLabel, { color: colors.primary }]}>
                PT Tip
              </Text>
              <Text variant="bodySmall" style={[styles.tipText, { color: colors.text }]}>
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
  card: { marginVertical: 5, borderRadius: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleBlock: { flex: 1 },
  name: { fontWeight: '600' },
  completedName: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  detail: { marginTop: 4 },
  divider: { marginVertical: 8 },
  description: { lineHeight: 18 },
  tipBox: { borderRadius: 8, padding: 10, marginTop: 8 },
  tipLabel: { fontWeight: '700', marginBottom: 3 },
  tipText: { lineHeight: 17 },
});
