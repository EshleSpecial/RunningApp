import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Surface, Text, TextInput } from 'react-native-paper';
import { clearAll, loadUserProfile, saveTrainingPlan, saveUserProfile } from '../../lib/storage';
import { generateTrainingPlan } from '../../lib/trainingPlan';
import { formatPace } from '../../lib/fueling';
import type { UserProfile } from '../../types';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [weeklyMiles, setWeeklyMiles] = useState('');
  const [painLevel, setPainLevel] = useState(3);
  const [wineDate, setWineDate] = useState('');
  const [dopeyDate, setDopeyDate] = useState('');
  const [trainingDays, setTrainingDays] = useState(5);
  const [prefersTreadmill, setPrefersTreadmill] = useState(false);
  const [pace, setPace] = useState(13.0);
  const [courseDifficulty, setCourseDifficulty] = useState<'flat' | 'rolling' | 'hilly' | 'very_hilly'>('flat');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const p = await loadUserProfile();
    if (p) {
      setProfile(p);
      setName(p.name);
      setWeeklyMiles(String(p.currentWeeklyMiles));
      setPainLevel(p.hipPainLevel);
      setWineDate(p.wineAndDineDate);
      setDopeyDate(p.dopeyStartDate);
      setTrainingDays(p.trainingDaysPerWeek ?? 5);
      setPrefersTreadmill(p.prefersTreadmill ?? false);
      setPace(p.currentPaceMinPerMile ?? 13.0);
      setCourseDifficulty(p.raceCourseDifficulty ?? 'flat');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveChanges() {
    if (!profile) return;
    setSaving(true);
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      currentWeeklyMiles: parseFloat(weeklyMiles) || profile.currentWeeklyMiles,
      hipPainLevel: painLevel,
      wineAndDineDate: wineDate,
      dopeyStartDate: dopeyDate,
      trainingDaysPerWeek: trainingDays,
      prefersTreadmill,
      currentPaceMinPerMile: pace,
      raceCourseDifficulty: courseDifficulty,
    };
    const plan = generateTrainingPlan(updated);
    await saveUserProfile(updated);
    await saveTrainingPlan(plan);
    setProfile(updated);
    setSaving(false);
    setEditing(false);
  }

  function confirmReset() {
    Alert.alert('Reset All Data', 'This will delete your profile and training plan. You’ll go through onboarding again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await clearAll(); router.replace('/onboarding'); } },
    ]);
  }

  if (!profile) return <View style={styles.centered}><Text>Loading…</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Profile</Text>
        <Text variant="bodySmall" style={styles.subtitle}>{profile.name}'s Training Journey</Text>
      </View>

      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardRow}>
          <Text style={styles.label}>Name</Text>
          {editing ? <TextInput value={name} onChangeText={setName} mode="outlined" dense style={styles.inlineInput} /> : <Text style={styles.value}>{profile.name}</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Weekly mileage</Text>
          {editing ? <TextInput value={weeklyMiles} onChangeText={setWeeklyMiles} mode="outlined" dense keyboardType="decimal-pad" style={styles.inlineInput} right={<TextInput.Affix text="mi" />} /> : <Text style={styles.value}>{profile.currentWeeklyMiles} mi/wk</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Hip pain level</Text>
          {editing ? (
            <View style={styles.painMini}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <Button key={n} mode={painLevel === n ? 'contained' : 'outlined'} onPress={() => setPainLevel(n)}
                  style={[styles.painMiniBtn, painLevel === n && { backgroundColor: '#1e40af' }]}
                  labelStyle={[{ fontSize: 10, fontWeight: '700' }, painLevel === n && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 0, minWidth: 0 }}>{String(n)}</Button>
              ))}
            </View>
          ) : <Text style={styles.value}>{profile.hipPainLevel} / 10</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Wine & Dine date</Text>
          {editing ? <TextInput value={wineDate} onChangeText={setWineDate} mode="outlined" dense style={styles.inlineInput} placeholder="yyyy-MM-dd" /> : <Text style={styles.value}>{profile.wineAndDineDate}</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Dopey Day 1 date</Text>
          {editing ? <TextInput value={dopeyDate} onChangeText={setDopeyDate} mode="outlined" dense style={styles.inlineInput} placeholder="yyyy-MM-dd" /> : <Text style={styles.value}>{profile.dopeyStartDate}</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Training days/week</Text>
          {editing ? (
            <View style={styles.daysRow}>
              {[3,4,5,6].map(d => (
                <Button key={d} mode={trainingDays === d ? 'contained' : 'outlined'} onPress={() => setTrainingDays(d)}
                  style={[styles.dayBtn, trainingDays === d && { backgroundColor: '#1e40af' }]}
                  labelStyle={[{ fontSize: 11, fontWeight: '700' }, trainingDays === d && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 0, minWidth: 0 }}>{String(d)}</Button>
              ))}
            </View>
          ) : <Text style={styles.value}>{profile.trainingDaysPerWeek ?? 5} days</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Running surface</Text>
          {editing ? (
            <View style={styles.envRow}>
              <Button mode={!prefersTreadmill ? 'contained' : 'outlined'} onPress={() => setPrefersTreadmill(false)}
                style={[styles.envBtn, !prefersTreadmill && { backgroundColor: '#16a34a' }]}
                labelStyle={[{ fontSize: 11 }, !prefersTreadmill && { color: '#fff' }]}
                contentStyle={{ paddingHorizontal: 6, minWidth: 0 }}>Outdoor</Button>
              <Button mode={prefersTreadmill ? 'contained' : 'outlined'} onPress={() => setPrefersTreadmill(true)}
                style={[styles.envBtn, prefersTreadmill && { backgroundColor: '#1e40af' }]}
                labelStyle={[{ fontSize: 11 }, prefersTreadmill && { color: '#fff' }]}
                contentStyle={{ paddingHorizontal: 6, minWidth: 0 }}>Treadmill</Button>
            </View>
          ) : <Text style={styles.value}>{(profile.prefersTreadmill ?? false) ? 'Treadmill' : 'Outdoor'}</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Easy pace</Text>
          {editing ? (
            <View style={styles.paceCol}>
              {[{label:'< 10:00/mi',value:9.5},{label:'10–12/mi',value:11.0},{label:'12–14/mi',value:13.0},{label:'14–16/mi',value:15.0},{label:'16+/mi',value:17.0}].map(opt => (
                <Button key={opt.value} mode={pace === opt.value ? 'contained' : 'outlined'} onPress={() => setPace(opt.value)}
                  style={[styles.paceBtn, pace === opt.value && { backgroundColor: '#7c3aed' }]}
                  labelStyle={[{ fontSize: 11 }, pace === opt.value && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 4, minWidth: 0 }}>{opt.label}</Button>
              ))}
            </View>
          ) : <Text style={styles.value}>{formatPace(profile.currentPaceMinPerMile ?? 13.0)}</Text>}
        </View>
        <Divider style={styles.rowDivider} />
        <View style={styles.cardRow}>
          <Text style={styles.label}>Course terrain</Text>
          {editing ? (
            <View style={styles.courseRow}>
              {(['flat','rolling','hilly','very_hilly'] as const).map(d => (
                <Button key={d} mode={courseDifficulty === d ? 'contained' : 'outlined'} onPress={() => setCourseDifficulty(d)}
                  style={[styles.courseBtn, courseDifficulty === d && { backgroundColor: '#1e40af' }]}
                  labelStyle={[{ fontSize: 10 }, courseDifficulty === d && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 2, minWidth: 0 }}>
                  {d === 'very_hilly' ? 'V.Hilly' : d.charAt(0).toUpperCase() + d.slice(1)}
                </Button>
              ))}
            </View>
          ) : <Text style={styles.value}>{(profile.raceCourseDifficulty ?? 'flat').replace('_', ' ')}</Text>}
        </View>
      </Surface>

      {editing ? (
        <View style={styles.btnRow}>
          <Button mode="outlined" onPress={() => setEditing(false)} style={styles.btn}>Cancel</Button>
          <Button mode="contained" onPress={saveChanges} loading={saving} style={styles.btn}>Save & Regenerate Plan</Button>
        </View>
      ) : (
        <Button mode="outlined" onPress={() => setEditing(true)} style={styles.editBtn} icon="pencil">Edit Profile</Button>
      )}

      <Divider style={styles.divider} />

      <Surface style={styles.stravaCard} elevation={1}>
        <Text variant="titleSmall" style={styles.stravaTitle}>Strava Integration</Text>
        <Text style={styles.stravaDesc}>Connect Strava to automatically import your runs and keep your training log in sync.</Text>
        <Button mode="contained" disabled style={styles.stravaBtn} icon="strava">Connect Strava (Coming Soon)</Button>
      </Surface>

      <Divider style={styles.divider} />

      <Surface style={styles.aboutCard} elevation={0}>
        <Text variant="titleSmall" style={styles.aboutTitle}>About Your Plan</Text>
        <Text style={styles.aboutText}>
          • Phase 1–2: Build aerobic base safely with hip PT integration{'\n'}
          • Phase 3: Race-specific prep for Wine & Dine (10K + Half){'\n'}
          • Phase 4: Recovery after Wine & Dine weekend{'\n'}
          • Phase 5: Dopey-specific back-to-back long runs + full marathon prep{'\n\n'}
          Max weekly mileage increase: ~10% (conservative for gluteus minimus tear). Cutback week every 4th week.
        </Text>
      </Surface>

      <Button mode="outlined" onPress={confirmReset} style={styles.resetBtn} textColor="#dc2626">Reset All Data</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4ff' },
  content: { padding: 16, paddingTop: 56, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  title: { fontWeight: '800', color: '#1e40af' },
  subtitle: { color: '#6b7280', marginTop: 2 },
  card: { borderRadius: 12, backgroundColor: '#fff', marginBottom: 16, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  label: { color: '#6b7280', fontSize: 13, flex: 1 },
  value: { color: '#111827', fontWeight: '600', fontSize: 14 },
  rowDivider: { marginHorizontal: 14 },
  inlineInput: { flex: 1.5, backgroundColor: '#fff' },
  painMini: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, flex: 2, justifyContent: 'flex-end' },
  painMiniBtn: { width: 30, minWidth: 0, height: 30, borderRadius: 6 },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayBtn: { width: 40, minWidth: 0, height: 34, borderRadius: 6 },
  envRow: { flexDirection: 'row', gap: 6 },
  envBtn: { minWidth: 0 },
  paceCol: { gap: 4, flex: 1.5 },
  paceBtn: { minWidth: 0 },
  courseRow: { flexDirection: 'row', gap: 4, flex: 2, justifyContent: 'flex-end' },
  courseBtn: { minWidth: 0 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  btn: { flex: 1 },
  editBtn: { marginBottom: 12 },
  divider: { marginVertical: 16 },
  stravaCard: { borderRadius: 12, padding: 14, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fca5a5' },
  stravaTitle: { fontWeight: '700', color: '#dc2626', marginBottom: 6 },
  stravaDesc: { color: '#6b7280', marginBottom: 12, lineHeight: 18, fontSize: 13 },
  stravaBtn: { backgroundColor: '#fc4c02' },
  aboutCard: { borderRadius: 12, padding: 14, backgroundColor: '#f0f9ff' },
  aboutTitle: { fontWeight: '700', color: '#0369a1', marginBottom: 8 },
  aboutText: { color: '#0c4a6e', lineHeight: 20, fontSize: 12 },
  resetBtn: { marginTop: 24, borderColor: '#dc2626' },
});
