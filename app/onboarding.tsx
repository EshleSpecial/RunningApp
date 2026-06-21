import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Surface, Text, TextInput } from 'react-native-paper';
import { generateTrainingPlan } from '../lib/trainingPlan';
import { saveTrainingPlan, saveUserProfile } from '../lib/storage';
import type { UserProfile } from '../types';

const STEPS = 7;

const PAIN_LABELS: Record<number, string> = {
  1: 'No pain', 2: 'Very mild', 3: 'Mild', 4: 'Mild–moderate',
  5: 'Moderate', 6: 'Moderate–significant', 7: 'Significant',
  8: 'High', 9: 'Very high', 10: 'Severe',
};

const PACE_OPTIONS: { label: string; value: number }[] = [
  { label: 'Under 10:00/mi', value: 9.5 },
  { label: '10:00 – 12:00/mi', value: 11.0 },
  { label: '12:00 – 14:00/mi', value: 13.0 },
  { label: '14:00 – 16:00/mi', value: 15.0 },
  { label: 'Over 16:00/mi', value: 17.0 },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [weeklyMiles, setWeeklyMiles] = useState('');
  const [painLevel, setPainLevel] = useState(4);
  const [trainingDays, setTrainingDays] = useState(5);
  const [prefersTreadmill, setPrefersTreadmill] = useState(false);
  const [pace, setPace] = useState(13.0);
  const [courseDifficulty, setCourseDifficulty] = useState<'flat' | 'rolling' | 'hilly' | 'very_hilly'>('flat');
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
      trainingDaysPerWeek: trainingDays,
      prefersTreadmill,
      currentPaceMinPerMile: pace,
      raceCourseDifficulty: courseDifficulty,
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
    step === 2 || step === 3 || step === 4 || step === 5 || step === 6;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Race Training</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Let's build your plan</Text>
          <ProgressBar progress={(step + 1) / STEPS} color="#1e40af" style={styles.progress} />
          <Text style={styles.stepLabel}>Step {step + 1} of {STEPS}</Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          {step === 0 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>What's your name?</Text>
              <Text style={styles.stepDesc}>Just so the app can cheer you on.</Text>
              <TextInput label="Your name" value={name} onChangeText={setName} mode="outlined" style={styles.input} autoFocus returnKeyType="next" onSubmitEditing={next} />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Current weekly mileage</Text>
              <Text style={styles.stepDesc}>How many miles per week are you running right now? Enter 0 if you're just starting back.</Text>
              <TextInput label="Miles per week" value={weeklyMiles} onChangeText={setWeeklyMiles} mode="outlined" keyboardType="decimal-pad" style={styles.input} autoFocus right={<TextInput.Affix text="mi/wk" />} returnKeyType="next" onSubmitEditing={next} />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Any current pain or injuries?</Text>
              <Text style={styles.stepDesc}>Rate any pain or discomfort on a scale of 1–10. This helps calibrate your starting plan.</Text>
              <View style={styles.painGrid}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <Button key={n} mode={painLevel === n ? 'contained' : 'outlined'} onPress={() => setPainLevel(n)}
                    style={[styles.painBtn, painLevel === n && { backgroundColor: painColor(n) }]}
                    labelStyle={[styles.painBtnLabel, painLevel === n && { color: '#fff' }]}
                    contentStyle={{ minWidth: 0, paddingHorizontal: 0 }}>{String(n)}</Button>
                ))}
              </View>
              <Surface style={[styles.painLabel, { backgroundColor: painColor(painLevel) + '22' }]} elevation={0}>
                <Text style={[styles.painLabelText, { color: painColor(painLevel) }]}>{painLevel} — {PAIN_LABELS[painLevel]}</Text>
              </Surface>
              {painLevel >= 7 && (
                <Text style={styles.highPainWarning}>⚠️ High pain detected. Your plan will start conservatively with more cross-training. Please consult a doctor or PT before beginning.</Text>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Training days per week</Text>
              <Text style={styles.stepDesc}>How many days per week can you realistically commit to training? Your plan will fit within this schedule.</Text>
              <View style={styles.daysGrid}>
                {[3,4,5,6].map(d => (
                  <Button key={d} mode={trainingDays === d ? 'contained' : 'outlined'} onPress={() => setTrainingDays(d)}
                    style={[styles.dayBtn, trainingDays === d && { backgroundColor: '#1e40af' }]}
                    labelStyle={[styles.dayBtnLabel, trainingDays === d && { color: '#fff' }]}>{d} days</Button>
                ))}
              </View>
              <Surface style={styles.daysDesc} elevation={0}>
                <Text style={styles.daysDescText}>{daysDescription(trainingDays)}</Text>
              </Surface>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Your training setup</Text>
              <Text style={styles.stepDesc}>Where will you be running most of the time?</Text>
              <View style={styles.envRow}>
                <Button mode={!prefersTreadmill ? 'contained' : 'outlined'} onPress={() => setPrefersTreadmill(false)}
                  style={[styles.envBtn, !prefersTreadmill && { backgroundColor: '#16a34a' }]}
                  labelStyle={!prefersTreadmill ? { color: '#fff' } : undefined} icon="weather-sunny">Outdoors</Button>
                <Button mode={prefersTreadmill ? 'contained' : 'outlined'} onPress={() => setPrefersTreadmill(true)}
                  style={[styles.envBtn, prefersTreadmill && { backgroundColor: '#1e40af' }]}
                  labelStyle={prefersTreadmill ? { color: '#fff' } : undefined} icon="run-fast">Treadmill</Button>
              </View>
              <Text style={[styles.stepDesc, { marginTop: 20 }]}>What's your comfortable easy running pace?</Text>
              <View style={styles.paceGrid}>
                {PACE_OPTIONS.map(opt => (
                  <Button key={opt.value} mode={pace === opt.value ? 'contained' : 'outlined'} onPress={() => setPace(opt.value)}
                    style={[styles.paceBtn, pace === opt.value && { backgroundColor: '#7c3aed' }]}
                    labelStyle={[styles.paceBtnLabel, pace === opt.value && { color: '#fff' }]}>{opt.label}</Button>
                ))}
              </View>
              {prefersTreadmill && <Text style={styles.treadmillNote}>🏃 Your workouts will include treadmill speed & incline recommendations.</Text>}
            </View>
          )}

          {step === 5 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Race course terrain</Text>
              <Text style={styles.stepDesc}>How hilly is your race course? Your plan will include terrain-specific training for hilly races.</Text>
              <View style={styles.courseGrid}>
                {([
                  { value: 'flat',       label: '⬜ Flat',        },
                  { value: 'rolling',    label: '〰️ Rolling',   },
                  { value: 'hilly',      label: '⛰️ Hilly',      },
                  { value: 'very_hilly', label: '🏔️ Very Hilly', },
                ] as const).map(opt => (
                  <Button key={opt.value} mode={courseDifficulty === opt.value ? 'contained' : 'outlined'} onPress={() => setCourseDifficulty(opt.value)}
                    style={[styles.courseBtn, courseDifficulty === opt.value && { backgroundColor: '#1e40af' }]}
                    labelStyle={[styles.courseBtnLabel, courseDifficulty === opt.value && { color: '#fff' }]}>{opt.label}</Button>
                ))}
              </View>
              {(courseDifficulty === 'hilly' || courseDifficulty === 'very_hilly') && (
                <Surface style={styles.hillNote} elevation={0}>
                  <Text style={styles.hillNoteText}>⛰️ Hill training will be added to your mid-week workouts to prepare for your course.</Text>
                </Surface>
              )}
            </View>
          )}

          {step === 6 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Confirm race dates</Text>
              <Text style={styles.stepDesc}>Pre-filled with typical runDisney dates. Adjust if your registration confirmation shows different dates.</Text>
              <Text variant="labelLarge" style={styles.fieldLabel}>Wine & Dine 10K date</Text>
              <TextInput label="Wine & Dine (yyyy-MM-dd)" value={wineDate} onChangeText={setWineDate} mode="outlined" style={styles.input} placeholder="2026-10-31" />
              <Text style={styles.fieldHint}>10K on this date, Half Marathon the following morning.</Text>
              <Text variant="labelLarge" style={[styles.fieldLabel, { marginTop: 16 }]}>Dopey 5K date (Day 1)</Text>
              <TextInput label="Dopey Day 1 (yyyy-MM-dd)" value={dopeyDate} onChangeText={setDopeyDate} mode="outlined" style={styles.input} placeholder="2027-01-07" />
              <Text style={styles.fieldHint}>5K Thu · 10K Fri · Half Sat · Full Sun</Text>
            </View>
          )}
        </Surface>

        <View style={styles.navRow}>
          {step > 0 ? (
            <Button mode="outlined" onPress={back} style={styles.navBtn}>Back</Button>
          ) : (
            <View style={styles.navBtn} />
          )}
          <Button mode="contained" onPress={next} disabled={!canNext || saving} loading={saving} style={styles.navBtn}>
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

function daysDescription(days: number): string {
  switch (days) {
    case 3: return '3 days — focused & minimal. Long run + 1 easy + cross-train each week.';
    case 4: return '4 days — solid foundation. Long run, 2 easy runs, cross-train.';
    case 5: return '5 days — standard plan. Balanced mix of runs, cross-train, and PT.';
    case 6: return '6 days — high commitment. Maximizes training volume and variety.';
    default: return '';
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f0f4ff' },
  header: { marginTop: 48, marginBottom: 24, alignItems: 'center' },
  title: { fontWeight: '800', color: '#1e40af' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  progress: { width: '100%', height: 6, borderRadius: 3, marginTop: 20 },
  stepLabel: { color: '#9ca3af', fontSize: 12, marginTop: 6 },
  card: { borderRadius: 16, padding: 20, backgroundColor: '#ffffff', flex: 1 },
  stepTitle: { fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  stepDesc: { color: '#6b7280', lineHeight: 20, marginBottom: 20 },
  input: { marginTop: 4, backgroundColor: '#fff' },
  painGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  painBtn: { width: 48, minWidth: 0 },
  painBtnLabel: { fontSize: 14, fontWeight: '700' },
  painLabel: { borderRadius: 8, padding: 10, alignItems: 'center', marginVertical: 8 },
  painLabelText: { fontWeight: '700', fontSize: 15 },
  highPainWarning: { color: '#b45309', backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 8, lineHeight: 18 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  dayBtn: { flex: 1, minWidth: 0 },
  dayBtnLabel: { fontSize: 14, fontWeight: '700' },
  daysDesc: { borderRadius: 8, padding: 12, backgroundColor: '#dbeafe' },
  daysDescText: { color: '#1e40af', fontSize: 13, lineHeight: 18 },
  envRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  envBtn: { flex: 1 },
  paceGrid: { gap: 8, marginVertical: 8 },
  paceBtn: { width: '100%' },
  paceBtnLabel: { fontSize: 13 },
  treadmillNote: { color: '#1e40af', backgroundColor: '#dbeafe', borderRadius: 8, padding: 10, marginTop: 12, fontSize: 12 },
  courseGrid: { gap: 10, marginVertical: 12 },
  courseBtn: { width: '100%' },
  courseBtnLabel: { fontSize: 13 },
  hillNote: { borderRadius: 8, padding: 12, backgroundColor: '#ecfdf5' },
  hillNoteText: { color: '#065f46', fontSize: 13, lineHeight: 18 },
  fieldLabel: { color: '#374151', marginBottom: 4 },
  fieldHint: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  navBtn: { flex: 1 },
});
