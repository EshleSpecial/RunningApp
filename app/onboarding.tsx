import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Surface, Text, TextInput } from 'react-native-paper';
import { generateTrainingPlan } from '../lib/trainingPlan';
import { saveTrainingPlan, saveUserProfile } from '../lib/storage';
import type { UserProfile } from '../types';

const STEPS = 4;

const PAIN_LABELS: Record<number, string> = {
  1: 'No pain',
  2: 'Very mild',
  3: 'Mild',
  4: 'Mild–moderate',
  5: 'Moderate',
  6: 'Moderate–significant',
  7: 'Significant',
  8: 'High',
  9: 'Very high',
  10: 'Severe',
};

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [weeklyMiles, setWeeklyMiles] = useState('');
  const [painLevel, setPainLevel] = useState(4);
  const [wineDate, setWineDate] = useState('2026-10-31');
  const [dopeyDate, setDopeyDate] = useState('2027-01-07');
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const profile: UserProfile = {
      name: name.trim() || 'Runner',
      currentWeeklyMiles: parseFloat(weeklyMiles) || 0,
      hipPainLevel: painLevel,
      wineAndDineDate: wineDate,
      dopeyStartDate: dopeyDate,
      onboardingComplete: true,
    };
    const plan = generateTrainingPlan(profile);
    await saveUserProfile(profile);
    await saveTrainingPlan(plan);
    router.replace('/(tabs)');
  }

  function next() {
    if (step < STEPS - 1) setStep(s => s + 1);
    else finish();
  }

  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && weeklyMiles !== '') ||
    step === 2 ||
    step === 3;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>RunDisney Training</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Let's build your plan</Text>
          <ProgressBar
            progress={(step + 1) / STEPS}
            color="#1e40af"
            style={styles.progress}
          />
          <Text style={styles.stepLabel}>Step {step + 1} of {STEPS}</Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          {step === 0 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>What's your name?</Text>
              <Text style={styles.stepDesc}>Just so the app can cheer you on.</Text>
              <TextInput
                label="Your name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={next}
              />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Current weekly mileage</Text>
              <Text style={styles.stepDesc}>
                How many miles per week are you running right now? Enter 0 if you're just starting back.
              </Text>
              <TextInput
                label="Miles per week"
                value={weeklyMiles}
                onChangeText={setWeeklyMiles}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                autoFocus
                right={<TextInput.Affix text="mi/wk" />}
                returnKeyType="next"
                onSubmitEditing={next}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Hip pain level today</Text>
              <Text style={styles.stepDesc}>
                Rate your gluteus minimus / hip pain on a scale of 1–10. This helps calibrate your starting plan.
              </Text>
              <View style={styles.painGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <Button
                    key={n}
                    mode={painLevel === n ? 'contained' : 'outlined'}
                    onPress={() => setPainLevel(n)}
                    style={[styles.painBtn, painLevel === n && { backgroundColor: painColor(n) }]}
                    labelStyle={[styles.painBtnLabel, painLevel === n && { color: '#fff' }]}
                    contentStyle={{ minWidth: 0, paddingHorizontal: 0 }}
                  >
                    {String(n)}
                  </Button>
                ))}
              </View>
              <Surface style={[styles.painLabel, { backgroundColor: painColor(painLevel) + '22' }]} elevation={0}>
                <Text style={[styles.painLabelText, { color: painColor(painLevel) }]}>
                  {painLevel} — {PAIN_LABELS[painLevel]}
                </Text>
              </Surface>
              {painLevel >= 7 && (
                <Text style={styles.highPainWarning}>
                  ⚠️ High pain level detected. Your plan will start conservatively with more cross-training.
                  Please consult your PT before beginning.
                </Text>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Confirm race dates</Text>
              <Text style={styles.stepDesc}>
                These are pre-filled with typical runDisney dates. Adjust if your registration confirmation shows different dates.
              </Text>

              <Text variant="labelLarge" style={styles.fieldLabel}>Wine & Dine 10K date</Text>
              <TextInput
                label="Wine & Dine (yyyy-MM-dd)"
                value={wineDate}
                onChangeText={setWineDate}
                mode="outlined"
                style={styles.input}
                placeholder="2026-10-31"
              />
              <Text style={styles.fieldHint}>10K on this date, Half Marathon the following morning.</Text>

              <Text variant="labelLarge" style={[styles.fieldLabel, { marginTop: 16 }]}>Dopey 5K date (Day 1)</Text>
              <TextInput
                label="Dopey Day 1 (yyyy-MM-dd)"
                value={dopeyDate}
                onChangeText={setDopeyDate}
                mode="outlined"
                style={styles.input}
                placeholder="2027-01-07"
              />
              <Text style={styles.fieldHint}>5K Thu · 10K Fri · Half Sat · Full Sun</Text>
            </View>
          )}
        </Surface>

        <View style={styles.navRow}>
          {step > 0 ? (
            <Button mode="outlined" onPress={back} style={styles.navBtn}>
              Back
            </Button>
          ) : (
            <View style={styles.navBtn} />
          )}
          <Button
            mode="contained"
            onPress={next}
            disabled={!canNext || saving}
            loading={saving}
            style={styles.navBtn}
          >
            {step === STEPS - 1 ? 'Build My Plan' : 'Next'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function painColor(n: number): string {
  if (n <= 3) return '#16a34a';
  if (n <= 5) return '#d97706';
  if (n <= 7) return '#ea580c';
  return '#dc2626';
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f0f4ff',
  },
  header: {
    marginTop: 48,
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#1e40af',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  progress: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 20,
  },
  stepLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 6,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    flex: 1,
  },
  stepTitle: {
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  stepDesc: {
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    marginTop: 4,
    backgroundColor: '#fff',
  },
  painGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  painBtn: {
    width: 48,
    minWidth: 0,
  },
  painBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  painLabel: {
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginVertical: 8,
  },
  painLabelText: {
    fontWeight: '700',
    fontSize: 15,
  },
  highPainWarning: {
    color: '#b45309',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    lineHeight: 18,
  },
  fieldLabel: {
    color: '#374151',
    marginBottom: 4,
  },
  fieldHint: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  navBtn: {
    flex: 1,
  },
});
