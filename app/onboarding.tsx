import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Surface, Text, TextInput } from 'react-native-paper';
import { generateTrainingPlan } from '../lib/trainingPlan';
import { saveTrainingPlan, saveUserProfile } from '../lib/storage';
import type { Race, UserProfile } from '../types';

const STEPS = 8;

const FEELING_LABELS: Record<number, string> = {
  1: 'Amazing',
  2: 'Really good',
  3: 'Good',
  4: 'Pretty good',
  5: 'OK',
  6: 'A bit off',
  7: 'Not great',
  8: 'Rough',
  9: 'Really rough',
  10: 'Struggling',
};

const PACE_OPTIONS: { label: string; value: number }[] = [
  { label: 'Under 10:00/mi', value: 9.5 },
  { label: '10:00 - 12:00/mi', value: 11.0 },
  { label: '12:00 - 14:00/mi', value: 13.0 },
  { label: '14:00 - 16:00/mi', value: 15.0 },
  { label: 'Over 16:00/mi', value: 17.0 },
];

const DISTANCE_OPTIONS: { label: string; value: number }[] = [
  { label: '5K (3.1mi)', value: 3.1 },
  { label: '10K (6.2mi)', value: 6.2 },
  { label: 'Half (13.1mi)', value: 13.1 },
  { label: 'Full (26.2mi)', value: 26.2 },
  { label: 'Other', value: 0 },
];

const INJURY_OPTIONS = [
  'IT Band',
  'Plantar Fasciitis',
  'Shin Splints',
  'Hip Flexor',
  'Stress Fracture',
  "Runner's Knee",
  'Achilles',
  'Lower Back',
  'Other',
];

const PLAN_WEEK_OPTIONS = [7, 10, 14, 18];

type GoalType = 'multi_race' | 'single_race' | 'no_date_plan' | 'general_training';

const GOAL_OPTIONS: { value: GoalType; label: string; desc: string }[] = [
  { value: 'multi_race',       label: 'Multiple races',          desc: "I have several races I'm training for" },
  { value: 'single_race',      label: 'One race',                desc: 'I have one specific race as my goal' },
  { value: 'no_date_plan',     label: 'A race type, no date yet', desc: 'I want a structured plan without a set race date' },
  { value: 'general_training', label: 'General fitness',         desc: 'I want to improve and track my runs' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  // atRaceStep inserts the race/plan-length screen between step 6 and step 7
  const [atRaceStep, setAtRaceStep] = useState(false);

  const [name, setName] = useState('');
  const [weeklyMiles, setWeeklyMiles] = useState('');
  const [feelingLevel, setFeelingLevel] = useState(3);
  const [trainingDays, setTrainingDays] = useState(5);
  const [prefersTreadmill, setPrefersTreadmill] = useState(false);
  const [pace, setPace] = useState(13.0);
  const [courseDifficulty, setCourseDifficulty] = useState<'flat' | 'rolling' | 'hilly' | 'very_hilly'>('flat');

  const [goalType, setGoalType] = useState<GoalType>('multi_race');
  const [races, setRaces] = useState<Race[]>([]);
  const [planWeeks, setPlanWeeks] = useState(14);

  const [currentRaceName, setCurrentRaceName] = useState('');
  const [currentRaceDate, setCurrentRaceDate] = useState('');
  const [currentRaceDistance, setCurrentRaceDistance] = useState(13.1);
  const [customDistance, setCustomDistance] = useState('');

  const [hasInjury, setHasInjury] = useState(false);
  const [injuryType, setInjuryType] = useState('');
  const [injuryNotes, setInjuryNotes] = useState('');

  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const profile: UserProfile = {
      name: name.trim() || 'Runner',
      currentWeeklyMiles: parseFloat(weeklyMiles) || 0,
      feelingLevel,
      goalType,
      races,
      planWeeks,
      injury: hasInjury ? { type: injuryType, description: injuryNotes || undefined } : undefined,
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
    if (step === 6 && !atRaceStep && goalType !== 'general_training') {
      setAtRaceStep(true);
      return;
    }
    if (atRaceStep) {
      setAtRaceStep(false);
      setStep(7);
      return;
    }
    if (step < STEPS - 1) setStep(s => s + 1);
    else finish();
  }

  function back() {
    if (atRaceStep) {
      setAtRaceStep(false);
      setStep(6);
      return;
    }
    if (step > 0) setStep(s => s - 1);
  }

  function addRace() {
    const dist = currentRaceDistance === 0 ? (parseFloat(customDistance) || 13.1) : currentRaceDistance;
    if (!currentRaceName.trim() || !currentRaceDate.trim()) return;
    const newRace: Race = {
      id: String(Date.now()),
      name: currentRaceName.trim(),
      date: currentRaceDate.trim(),
      distanceMiles: dist,
    };
    setRaces(prev => [...prev, newRace]);
    setCurrentRaceName('');
    setCurrentRaceDate('');
    setCurrentRaceDistance(13.1);
    setCustomDistance('');
  }

  function removeRace(idx: number) {
    setRaces(prev => prev.filter((_, i) => i !== idx));
  }

  const displayStep = atRaceStep ? 7 : step + 1;
  const displayProgress = atRaceStep ? 7 / STEPS : (step + 1) / STEPS;

  const canNext = (() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return weeklyMiles !== '';
    if (atRaceStep) {
      if (goalType === 'no_date_plan') return true;
      return races.length > 0;
    }
    return true;
  })();

  const selectedGoal = GOAL_OPTIONS.find(g => g.value === goalType);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>Race Training</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Let's build your plan</Text>
          <ProgressBar
            progress={displayProgress}
            color="#1a2f5a"
            style={styles.progress}
          />
          <Text style={styles.stepLabel}>Step {displayStep} of {STEPS}</Text>
        </View>

        <Surface style={styles.card} elevation={2}>

          {/* Step 0: Name */}
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

          {/* Step 1: Weekly mileage */}
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

          {/* Step 2: Feeling level */}
          {step === 2 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>How are you feeling overall?</Text>
              <Text style={styles.stepDesc}>
                Rate your current overall wellbeing. This helps calibrate your starting point.
              </Text>
              <View style={styles.painGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <Button
                    key={n}
                    mode={feelingLevel === n ? 'contained' : 'outlined'}
                    onPress={() => setFeelingLevel(n)}
                    style={[styles.painBtn, feelingLevel === n && { backgroundColor: feelingColor(n) }]}
                    labelStyle={[styles.painBtnLabel, feelingLevel === n && { color: '#fff' }]}
                    contentStyle={{ minWidth: 0, paddingHorizontal: 0 }}
                  >
                    {String(n)}
                  </Button>
                ))}
              </View>
              <Surface style={[styles.feelingLabel, { backgroundColor: feelingColor(feelingLevel) + '22' }]} elevation={0}>
                <Text style={[styles.feelingLabelText, { color: feelingColor(feelingLevel) }]}>
                  {feelingLevel} — {FEELING_LABELS[feelingLevel]}
                </Text>
              </Surface>
            </View>
          )}

          {/* Step 3: Training days */}
          {step === 3 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Training days per week</Text>
              <Text style={styles.stepDesc}>
                How many days per week can you realistically commit to training?
                Your plan will fit within this schedule.
              </Text>
              <View style={styles.daysGrid}>
                {[3, 4, 5, 6].map(d => (
                  <Button
                    key={d}
                    mode={trainingDays === d ? 'contained' : 'outlined'}
                    onPress={() => setTrainingDays(d)}
                    style={[styles.dayBtn, trainingDays === d && { backgroundColor: '#1a2f5a' }]}
                    labelStyle={[styles.dayBtnLabel, trainingDays === d && { color: '#fff' }]}
                  >
                    {d} days
                  </Button>
                ))}
              </View>
              <Surface style={styles.daysDesc} elevation={0}>
                <Text style={styles.daysDescText}>{daysDescription(trainingDays)}</Text>
              </Surface>
            </View>
          )}

          {/* Step 4: Environment + pace */}
          {step === 4 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Your training setup</Text>
              <Text style={styles.stepDesc}>Where will you be running most of the time?</Text>
              <View style={styles.envRow}>
                <Button
                  mode={!prefersTreadmill ? 'contained' : 'outlined'}
                  onPress={() => setPrefersTreadmill(false)}
                  style={[styles.envBtn, !prefersTreadmill && { backgroundColor: '#16a34a' }]}
                  labelStyle={!prefersTreadmill ? { color: '#fff' } : undefined}
                  icon="weather-sunny"
                >
                  Outdoors
                </Button>
                <Button
                  mode={prefersTreadmill ? 'contained' : 'outlined'}
                  onPress={() => setPrefersTreadmill(true)}
                  style={[styles.envBtn, prefersTreadmill && { backgroundColor: '#1a2f5a' }]}
                  labelStyle={prefersTreadmill ? { color: '#fff' } : undefined}
                  icon="run-fast"
                >
                  Treadmill
                </Button>
              </View>
              <Text style={[styles.stepDesc, { marginTop: 20 }]}>
                What's your comfortable easy running pace?
              </Text>
              <View style={styles.paceGrid}>
                {PACE_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    mode={pace === opt.value ? 'contained' : 'outlined'}
                    onPress={() => setPace(opt.value)}
                    style={[styles.paceBtn, pace === opt.value && { backgroundColor: '#7c3aed' }]}
                    labelStyle={[styles.paceBtnLabel, pace === opt.value && { color: '#fff' }]}
                  >
                    {opt.label}
                  </Button>
                ))}
              </View>
              {prefersTreadmill && (
                <Text style={styles.treadmillNote}>
                  Your workouts will include treadmill speed and incline recommendations.
                </Text>
              )}
            </View>
          )}

          {/* Step 5: Course difficulty */}
          {step === 5 && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Race course terrain</Text>
              <Text style={styles.stepDesc}>
                How hilly is your race course? Your plan will include terrain-specific training.
              </Text>
              <View style={styles.courseGrid}>
                {([
                  { value: 'flat',       label: 'Flat',       desc: 'Mostly flat, no significant hills' },
                  { value: 'rolling',    label: 'Rolling',    desc: 'Gentle undulation, a few hills' },
                  { value: 'hilly',      label: 'Hilly',      desc: 'Significant elevation, frequent climbs' },
                  { value: 'very_hilly', label: 'Very Hilly', desc: 'Challenging elevation, steep climbs' },
                ] as const).map(opt => (
                  <Button
                    key={opt.value}
                    mode={courseDifficulty === opt.value ? 'contained' : 'outlined'}
                    onPress={() => setCourseDifficulty(opt.value)}
                    style={[styles.courseBtn, courseDifficulty === opt.value && { backgroundColor: '#1a2f5a' }]}
                    labelStyle={[styles.courseBtnLabel, courseDifficulty === opt.value && { color: '#fff' }]}
                  >
                    {opt.label}
                  </Button>
                ))}
              </View>
              {(courseDifficulty === 'hilly' || courseDifficulty === 'very_hilly') && (
                <Surface style={styles.hillNote} elevation={0}>
                  <Text style={styles.hillNoteText}>
                    Hill training will be added to your mid-week workouts to prepare for your course.
                  </Text>
                </Surface>
              )}
            </View>
          )}

          {/* Step 6: Goal type */}
          {step === 6 && !atRaceStep && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>What's your training goal?</Text>
              <View style={styles.goalGrid}>
                {GOAL_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    mode={goalType === opt.value ? 'contained' : 'outlined'}
                    onPress={() => setGoalType(opt.value)}
                    style={[styles.goalBtn, goalType === opt.value && { backgroundColor: '#1a2f5a' }]}
                    labelStyle={[styles.goalBtnLabel, goalType === opt.value && { color: '#fff' }]}
                  >
                    {opt.label}
                  </Button>
                ))}
              </View>
              {selectedGoal && (
                <Text style={styles.goalDesc}>{selectedGoal.desc}</Text>
              )}
            </View>
          )}

          {/* Race/plan-length step (virtual, between step 6 and step 7) */}
          {atRaceStep && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Add your race(s)</Text>

              {goalType === 'no_date_plan' ? (
                <>
                  <Text style={styles.stepDesc}>
                    How many weeks would you like your training plan to be?
                  </Text>
                  <View style={styles.daysGrid}>
                    {PLAN_WEEK_OPTIONS.map(w => (
                      <Button
                        key={w}
                        mode={planWeeks === w ? 'contained' : 'outlined'}
                        onPress={() => setPlanWeeks(w)}
                        style={[styles.dayBtn, planWeeks === w && { backgroundColor: '#1a2f5a' }]}
                        labelStyle={[styles.dayBtnLabel, planWeeks === w && { color: '#fff' }]}
                      >
                        {w} wks
                      </Button>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.stepDesc}>
                    {goalType === 'multi_race'
                      ? "Add each race you're training for. You can add more later."
                      : 'Add your goal race.'}
                  </Text>

                  <TextInput
                    label="Race name"
                    value={currentRaceName}
                    onChangeText={setCurrentRaceName}
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Race date (yyyy-MM-dd)"
                    value={currentRaceDate}
                    onChangeText={setCurrentRaceDate}
                    mode="outlined"
                    style={styles.input}
                    placeholder="2026-10-31"
                  />

                  <Text style={styles.fieldLabel}>Distance</Text>
                  <View style={styles.distanceGrid}>
                    {DISTANCE_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        mode={currentRaceDistance === opt.value ? 'contained' : 'outlined'}
                        onPress={() => setCurrentRaceDistance(opt.value)}
                        style={[styles.distBtn, currentRaceDistance === opt.value && { backgroundColor: '#7c3aed' }]}
                        labelStyle={[{ fontSize: 11 }, currentRaceDistance === opt.value && { color: '#fff' }]}
                        contentStyle={{ paddingHorizontal: 4, minWidth: 0 }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </View>

                  {currentRaceDistance === 0 && (
                    <TextInput
                      label="Distance in miles"
                      value={customDistance}
                      onChangeText={setCustomDistance}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                      right={<TextInput.Affix text="mi" />}
                    />
                  )}

                  <Button
                    mode="contained"
                    onPress={addRace}
                    disabled={!currentRaceName.trim() || !currentRaceDate.trim()}
                    style={styles.addRaceBtn}
                  >
                    Add Race
                  </Button>

                  {races.map((race, i) => (
                    <Surface key={race.id} style={styles.raceItem} elevation={0}>
                      <View style={styles.raceItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.raceItemName}>{race.name}</Text>
                          <Text style={styles.raceItemDetail}>{race.date} · {race.distanceMiles} mi</Text>
                        </View>
                        <Button
                          mode="text"
                          onPress={() => removeRace(i)}
                          textColor="#dc2626"
                          compact
                        >
                          Remove
                        </Button>
                      </View>
                    </Surface>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Step 7: Injury */}
          {step === 7 && !atRaceStep && (
            <View>
              <Text variant="titleLarge" style={styles.stepTitle}>Any injuries or pain areas?</Text>
              <View style={styles.injuryToggleRow}>
                <Button
                  mode={hasInjury ? 'contained' : 'outlined'}
                  onPress={() => setHasInjury(true)}
                  style={[styles.envBtn, hasInjury && { backgroundColor: '#dc2626' }]}
                  labelStyle={hasInjury ? { color: '#fff' } : undefined}
                >
                  Yes, I have an injury
                </Button>
                <Button
                  mode={!hasInjury ? 'contained' : 'outlined'}
                  onPress={() => setHasInjury(false)}
                  style={[styles.envBtn, !hasInjury && { backgroundColor: '#16a34a' }]}
                  labelStyle={!hasInjury ? { color: '#fff' } : undefined}
                >
                  No, I'm good
                </Button>
              </View>

              {hasInjury && (
                <>
                  <Text style={[styles.stepDesc, { marginTop: 16 }]}>Select your injury:</Text>
                  <View style={styles.injuryGrid}>
                    {INJURY_OPTIONS.map(inj => (
                      <Button
                        key={inj}
                        mode={injuryType === inj ? 'contained' : 'outlined'}
                        onPress={() => setInjuryType(inj)}
                        style={[styles.injuryBtn, injuryType === inj && { backgroundColor: '#1a2f5a' }]}
                        labelStyle={[{ fontSize: 12 }, injuryType === inj && { color: '#fff' }]}
                        contentStyle={{ paddingHorizontal: 6, minWidth: 0 }}
                      >
                        {inj}
                      </Button>
                    ))}
                  </View>
                  <TextInput
                    label="Additional details (optional)"
                    value={injuryNotes}
                    onChangeText={setInjuryNotes}
                    mode="outlined"
                    style={styles.input}
                    multiline
                    numberOfLines={2}
                  />
                  <Text style={styles.injuryNote}>
                    Your warmups, cooldowns, and runs will be tailored to support your recovery.
                  </Text>
                </>
              )}
            </View>
          )}

        </Surface>

        <View style={styles.navRow}>
          {step > 0 || atRaceStep ? (
            <Button mode="outlined" onPress={back} style={styles.navBtn}>Back</Button>
          ) : (
            <View style={styles.navBtn} />
          )}
          <Button
            mode="contained"
            onPress={next}
            disabled={!canNext || saving}
            loading={saving}
            style={[styles.navBtn, { backgroundColor: '#1a2f5a' }]}
          >
            {step === STEPS - 1 && !atRaceStep ? 'Build My Plan' : 'Next'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function feelingColor(n: number): string {
  if (n <= 2) return '#16a34a';
  if (n <= 4) return '#65a30d';
  if (n <= 6) return '#d97706';
  if (n <= 8) return '#ea580c';
  return '#dc2626';
}

function daysDescription(days: number): string {
  switch (days) {
    case 3: return '3 days — focused and minimal. Long run + 1 easy + cross-train each week.';
    case 4: return '4 days — solid foundation. Long run, 2 easy runs, cross-train.';
    case 5: return '5 days — standard plan. Balanced mix of runs, cross-train, and PT.';
    case 6: return '6 days — high commitment. Maximizes training volume and variety.';
    default: return '';
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f7f4' },
  header: { marginTop: 48, marginBottom: 24, alignItems: 'center' },
  title: { fontWeight: '800', color: '#1a2f5a' },
  subtitle: { color: '#6b7280', marginTop: 4 },
  progress: { width: '100%', height: 6, borderRadius: 3, marginTop: 20 },
  stepLabel: { color: '#9ca3af', fontSize: 12, marginTop: 6 },
  card: { borderRadius: 16, padding: 20, backgroundColor: '#ffffff', flex: 1 },
  stepTitle: { fontWeight: '700', color: '#1a2f5a', marginBottom: 8 },
  stepDesc: { color: '#6b7280', lineHeight: 20, marginBottom: 20 },
  input: { marginTop: 4, marginBottom: 12, backgroundColor: '#fff' },
  painGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  painBtn: { width: 48, minWidth: 0 },
  painBtnLabel: { fontSize: 14, fontWeight: '700' },
  feelingLabel: { borderRadius: 8, padding: 10, alignItems: 'center', marginVertical: 8 },
  feelingLabelText: { fontWeight: '700', fontSize: 15 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  dayBtn: { flex: 1, minWidth: 0 },
  dayBtnLabel: { fontSize: 14, fontWeight: '700' },
  daysDesc: { borderRadius: 8, padding: 12, backgroundColor: '#e8eaf0' },
  daysDescText: { color: '#1a2f5a', fontSize: 13, lineHeight: 18 },
  envRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  envBtn: { flex: 1 },
  paceGrid: { gap: 8, marginVertical: 8 },
  paceBtn: { width: '100%' },
  paceBtnLabel: { fontSize: 13 },
  treadmillNote: {
    color: '#1a2f5a',
    backgroundColor: '#e8eaf0',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    fontSize: 12,
  },
  courseGrid: { gap: 10, marginVertical: 12 },
  courseBtn: { width: '100%' },
  courseBtnLabel: { fontSize: 13 },
  hillNote: { borderRadius: 8, padding: 12, backgroundColor: '#ecfdf5' },
  hillNoteText: { color: '#065f46', fontSize: 13, lineHeight: 18 },
  goalGrid: { gap: 10, marginVertical: 12 },
  goalBtn: { width: '100%' },
  goalBtnLabel: { fontSize: 13 },
  goalDesc: { color: '#6b7280', fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  distanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  distBtn: { minWidth: 0 },
  addRaceBtn: { marginTop: 4, marginBottom: 16, backgroundColor: '#1a2f5a' },
  raceItem: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f0f4ff',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  raceItemRow: { flexDirection: 'row', alignItems: 'center' },
  raceItemName: { fontSize: 14, fontWeight: '600', color: '#1a2f5a' },
  raceItemDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  injuryToggleRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  injuryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  injuryBtn: { minWidth: 0 },
  injuryNote: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 8, lineHeight: 17 },
  fieldLabel: { color: '#374151', marginBottom: 6, fontSize: 13, fontWeight: '500' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  navBtn: { flex: 1 },
});
