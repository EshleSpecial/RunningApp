import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { formatPace } from '../lib/fueling';
import type { WorkoutLogEntry } from '../types';

interface Props {
  workoutDate: string;
  logEntry?: WorkoutLogEntry;
  onSave: (date: string, pace?: number, gels?: number) => void;
}

function parsePaceInput(raw: string): number | null {
  const trimmed = raw.trim();
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseInt(colonMatch[2], 10);
    if (secs >= 60) return null;
    return mins + secs / 60;
  }
  const numOnly = parseFloat(trimmed);
  if (!isNaN(numOnly) && numOnly > 0) return numOnly;
  return null;
}

export default function PostRunLogger({ workoutDate, logEntry, onSave }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [paceInput, setPaceInput] = useState('');
  const [gels, setGels] = useState(0);

  const alreadyLogged = !!logEntry?.actualPaceMinPerMile;

  if (alreadyLogged) {
    return (
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          ⏱ {formatPace(logEntry!.actualPaceMinPerMile!)}/mi
          {logEntry!.gelsConsumed != null ? `  🍯 ${logEntry!.gelsConsumed} gel${logEntry!.gelsConsumed !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>
    );
  }

  if (!showForm) {
    return (
      <TouchableOpacity onPress={() => setShowForm(true)} style={styles.prompt} activeOpacity={0.7}>
        <Text style={styles.promptText}>📝 Log pace & gels</Text>
      </TouchableOpacity>
    );
  }

  const parsedPace = parsePaceInput(paceInput);
  const valid = paceInput === '' || parsedPace !== null;

  function handleSave() {
    onSave(workoutDate, parsedPace ?? undefined, gels > 0 ? gels : undefined);
    setShowForm(false);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Log this run (optional)</Text>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>⏱ Pace (mm:ss/mi)</Text>
        <TextInput
          style={[styles.paceInput, !valid && styles.paceInputError]}
          value={paceInput}
          onChangeText={setPaceInput}
          placeholder="e.g. 12:30"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>🍯 Gels taken</Text>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={() => setGels(g => Math.max(0, g - 1))} style={styles.stepBtn} activeOpacity={0.7}>
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepValue}>{gels}</Text>
          <TouchableOpacity onPress={() => setGels(g => Math.min(10, g + 1))} style={styles.stepBtn} activeOpacity={0.7}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.btnRow}>
        <Button mode="outlined" onPress={() => setShowForm(false)} style={styles.btn} labelStyle={styles.btnLabel}>Skip</Button>
        <Button mode="contained" onPress={handleSave} disabled={!valid} style={[styles.btn, { backgroundColor: '#16a34a' }]} labelStyle={styles.btnLabel}>Save</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f0fdf4', borderRadius: 6 },
  summaryText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  prompt: { marginTop: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, borderStyle: 'dashed' },
  promptText: { fontSize: 12, color: '#6b7280' },
  form: { marginTop: 10, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  formTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#6b7280', flex: 1 },
  paceInput: { width: 80, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, textAlign: 'center', backgroundColor: '#fff' },
  paceInputError: { borderColor: '#ef4444' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  stepValue: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 20, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1 },
  btnLabel: { fontSize: 12 },
});
