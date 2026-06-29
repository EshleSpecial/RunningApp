import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Surface, Text, TextInput } from 'react-native-paper';
import { clearAll, loadUserProfile, loadTrainingPlan, saveTrainingPlan, saveUserProfile } from '../../lib/storage';
import { generateTrainingPlan } from '../../lib/trainingPlan';
import { formatPace } from '../../lib/fueling';
import {
  STRAVA_CLIENT_ID,
  clearStravaTokens,
  exchangeCodeForTokens,
  loadStravaTokens,
  syncStravaActivities,
  type StravaTokens,
} from '../../lib/strava';
import { useTheme } from '../../constants/theme';
import type { UserProfile } from '../../types';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URI = 'rundisney-training://localhost';

const STRAVA_DISCOVERY = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [weeklyMiles, setWeeklyMiles] = useState('');
  const [trainingDays, setTrainingDays] = useState(5);
  const [prefersTreadmill, setPrefersTreadmill] = useState(false);
  const [pace, setPace] = useState(13.0);
  const [courseDifficulty, setCourseDifficulty] = useState<'flat' | 'rolling' | 'hilly' | 'very_hilly'>('flat');
  const [saving, setSaving] = useState(false);

  // Strava state
  const [stravaTokens, setStravaTokens] = useState<StravaTokens | null>(null);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['activity:read_all'],
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { approval_prompt: 'auto' },
    },
    STRAVA_DISCOVERY
  );

  const load = useCallback(async () => {
    const [p, tok] = await Promise.all([loadUserProfile(), loadStravaTokens()]);
    if (p) {
      setProfile(p);
      setName(p.name);
      setWeeklyMiles(String(p.currentWeeklyMiles));
      setTrainingDays(p.trainingDaysPerWeek ?? 5);
      setPrefersTreadmill(p.prefersTreadmill ?? false);
      setPace(p.currentPaceMinPerMile ?? 13.0);
      setCourseDifficulty(p.raceCourseDifficulty ?? 'flat');
    }
    setStravaTokens(tok);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle OAuth redirect
  useEffect(() => {
    if (response?.type !== 'success') return;
    const { code } = response.params;
    if (!code) return;
    setStravaLoading(true);
    exchangeCodeForTokens(code).then(tokens => {
      if (tokens) {
        setStravaTokens(tokens);
        Alert.alert('Strava Connected', `Welcome, ${tokens.athleteName}! Syncing your runs…`);
        handleSync(tokens);
      } else {
        Alert.alert('Connection Failed', 'Could not exchange token. Check your Strava API credentials in lib/strava.ts.');
      }
      setStravaLoading(false);
    });
  }, [response]);

  async function handleSync(tokens?: StravaTokens) {
    setStravaLoading(true);
    setSyncStatus('Syncing…');
    try {
      const plan = await loadTrainingPlan();
      if (!plan) { setSyncStatus('No training plan found.'); return; }
      const result = await syncStravaActivities(plan);
      setSyncStatus(`Synced ${result.imported} new run${result.imported !== 1 ? 's' : ''} (${result.matched} matched).`);
    } catch (e: any) {
      setSyncStatus(`Sync failed: ${e.message}`);
    } finally {
      setStravaLoading(false);
    }
  }

  function handleDisconnect() {
    Alert.alert(
      'Disconnect Strava',
      'Remove Strava connection? Your already-imported runs will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearStravaTokens();
            setStravaTokens(null);
            setSyncStatus(null);
          },
        },
      ]
    );
  }

  async function saveChanges() {
    if (!profile) return;
    setSaving(true);
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      currentWeeklyMiles: parseFloat(weeklyMiles) || profile.currentWeeklyMiles,
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
    Alert.alert(
      'Reset All Data',
      "This will delete your profile and training plan. You'll go through onboarding again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>Profile</Text>
        <Text variant="bodySmall" style={[styles.subtitle, { color: colors.accent }]}>{profile.name}'s Training Journey</Text>
      </View>

      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          {editing ? (
            <TextInput value={name} onChangeText={setName} mode="outlined" dense style={[styles.inlineInput, { backgroundColor: colors.surface }]} />
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.name}</Text>
          )}
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Weekly mileage</Text>
          {editing ? (
            <TextInput
              value={weeklyMiles}
              onChangeText={setWeeklyMiles}
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              style={[styles.inlineInput, { backgroundColor: colors.surface }]}
              right={<TextInput.Affix text="mi" />}
            />
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.currentWeeklyMiles} mi/wk</Text>
          )}
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Feeling level</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.feelingLevel ?? '—'} / 10</Text>
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Goal type</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{(profile.goalType ?? 'general_training').replace(/_/g, ' ')}</Text>
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Races</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{(profile.races ?? []).length} added</Text>
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Injury</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.injury ? profile.injury.type : 'None'}</Text>
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Training days/week</Text>
          {editing ? (
            <View style={styles.daysRow}>
              {[3, 4, 5, 6].map(d => (
                <Button
                  key={d}
                  mode={trainingDays === d ? 'contained' : 'outlined'}
                  onPress={() => setTrainingDays(d)}
                  style={[styles.dayBtn, trainingDays === d && { backgroundColor: colors.primary }]}
                  labelStyle={[{ fontSize: 11, fontWeight: '700' }, trainingDays === d && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 0, minWidth: 0 }}
                >
                  {String(d)}
                </Button>
              ))}
            </View>
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>{profile.trainingDaysPerWeek ?? 5} days</Text>
          )}
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Running surface</Text>
          {editing ? (
            <View style={styles.envRow}>
              <Button
                mode={!prefersTreadmill ? 'contained' : 'outlined'}
                onPress={() => setPrefersTreadmill(false)}
                style={[styles.envBtn, !prefersTreadmill && { backgroundColor: colors.success }]}
                labelStyle={[{ fontSize: 11 }, !prefersTreadmill && { color: '#fff' }]}
                contentStyle={{ paddingHorizontal: 6, minWidth: 0 }}
              >
                Outdoor
              </Button>
              <Button
                mode={prefersTreadmill ? 'contained' : 'outlined'}
                onPress={() => setPrefersTreadmill(true)}
                style={[styles.envBtn, prefersTreadmill && { backgroundColor: colors.primary }]}
                labelStyle={[{ fontSize: 11 }, prefersTreadmill && { color: '#fff' }]}
                contentStyle={{ paddingHorizontal: 6, minWidth: 0 }}
              >
                Treadmill
              </Button>
            </View>
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>{(profile.prefersTreadmill ?? false) ? 'Treadmill' : 'Outdoor'}</Text>
          )}
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Easy pace</Text>
          {editing ? (
            <View style={styles.paceCol}>
              {[
                { label: '< 10:00/mi', value: 9.5 },
                { label: '10–12/mi', value: 11.0 },
                { label: '12–14/mi', value: 13.0 },
                { label: '14–16/mi', value: 15.0 },
                { label: '16+/mi', value: 17.0 },
              ].map(opt => (
                <Button
                  key={opt.value}
                  mode={pace === opt.value ? 'contained' : 'outlined'}
                  onPress={() => setPace(opt.value)}
                  style={[styles.paceBtn, pace === opt.value && { backgroundColor: colors.primary }]}
                  labelStyle={[{ fontSize: 11 }, pace === opt.value && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 4, minWidth: 0 }}
                >
                  {opt.label}
                </Button>
              ))}
            </View>
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatPace(profile.currentPaceMinPerMile ?? 13.0)}</Text>
          )}
        </View>
        <Divider style={styles.rowDivider} />

        <View style={styles.cardRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Course terrain</Text>
          {editing ? (
            <View style={styles.courseRow}>
              {(['flat', 'rolling', 'hilly', 'very_hilly'] as const).map(d => (
                <Button
                  key={d}
                  mode={courseDifficulty === d ? 'contained' : 'outlined'}
                  onPress={() => setCourseDifficulty(d)}
                  style={[styles.courseBtn, courseDifficulty === d && { backgroundColor: colors.primary }]}
                  labelStyle={[{ fontSize: 10 }, courseDifficulty === d && { color: '#fff' }]}
                  contentStyle={{ paddingHorizontal: 2, minWidth: 0 }}
                >
                  {d === 'very_hilly' ? 'V.Hilly' : d.charAt(0).toUpperCase() + d.slice(1)}
                </Button>
              ))}
            </View>
          ) : (
            <Text style={[styles.value, { color: colors.textPrimary }]}>{(profile.raceCourseDifficulty ?? 'flat').replace('_', ' ')}</Text>
          )}
        </View>
      </Surface>

      {editing ? (
        <View style={styles.btnRow}>
          <Button mode="outlined" onPress={() => setEditing(false)} style={styles.btn}>Cancel</Button>
          <Button mode="contained" onPress={saveChanges} loading={saving} style={[styles.btn, { backgroundColor: colors.primary }]}>
            Save & Regenerate Plan
          </Button>
        </View>
      ) : (
        <Button mode="outlined" onPress={() => setEditing(true)} style={styles.editBtn} icon="pencil">
          Edit Profile
        </Button>
      )}

      <Divider style={styles.divider} />

      {/* Strava Integration */}
      <Surface style={[styles.stravaCard, { backgroundColor: colors.surface, borderColor: colors.accent }]} elevation={1}>
        <Text variant="titleSmall" style={[styles.stravaTitle, { color: colors.accent }]}>Strava Integration</Text>

        {stravaTokens ? (
          <>
            <View style={styles.stravaConnected}>
              <Text style={[styles.stravaAthleteLabel, { color: colors.textPrimary }]}>Connected as</Text>
              <Text style={[styles.stravaAthleteName, { color: colors.textPrimary }]}>{stravaTokens.athleteName}</Text>
            </View>
            {syncStatus && (
              <Text style={[styles.syncStatus, { color: colors.success, backgroundColor: colors.success + '22' }]}>{syncStatus}</Text>
            )}
            <View style={styles.stravaBtnRow}>
              <Button
                mode="contained"
                onPress={() => handleSync()}
                loading={stravaLoading}
                style={[styles.syncBtn, { backgroundColor: colors.accent }]}
                icon="sync"
              >
                Sync Runs
              </Button>
              <Button
                mode="outlined"
                onPress={handleDisconnect}
                style={[styles.disconnectBtn, { borderColor: colors.danger }]}
                textColor={colors.danger}
              >
                Disconnect
              </Button>
            </View>
            <Text style={[styles.stravaNote, { color: colors.accent }]}>
              Garmin & Apple Watch runs sync automatically via Strava.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.stravaDesc, { color: colors.textPrimary }]}>
              Connect Strava to auto-import your runs. Works with Garmin, Apple Watch, and any Strava-connected device.
            </Text>
            <Button
              mode="contained"
              onPress={() => promptAsync()}
              loading={stravaLoading || !request}
              disabled={!request}
              style={[styles.stravaBtn, { backgroundColor: colors.accent }]}
              icon="strava"
            >
              Connect Strava
            </Button>
          </>
        )}
      </Surface>

      <Divider style={styles.divider} />

      {/* About */}
      <Surface style={[styles.aboutCard, { backgroundColor: colors.surface }]} elevation={0}>
        <Text variant="titleSmall" style={[styles.aboutTitle, { color: colors.primary }]}>About Your Plan</Text>
        <Text style={[styles.aboutText, { color: colors.textPrimary }]}>
          • Phase 1–2: Build aerobic base and establish consistent weekly mileage{'\n'}
          • Phase 3: Race-specific prep — tempo runs, long efforts, and terrain training{'\n'}
          • Phase 4: Peak and taper leading into race week{'\n'}
          • Phase 5: Post-race recovery and next-goal transition{'\n\n'}
          Mileage increases ~10% per week with a cutback week every 4th week.
          PT exercises are integrated throughout to keep you healthy.
        </Text>
      </Surface>

      <Button mode="outlined" onPress={confirmReset} style={[styles.resetBtn, { borderColor: colors.danger }]} textColor={colors.danger}>
        Reset All Data
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 56, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 2 },
  card: { borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  label: { fontSize: 13, flex: 1 },
  value: { fontWeight: '600', fontSize: 14 },
  rowDivider: { marginHorizontal: 14 },
  inlineInput: { flex: 1.5 },
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

  stravaCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  stravaTitle: { fontWeight: '700', marginBottom: 8 },
  stravaDesc: { marginBottom: 12, lineHeight: 18, fontSize: 13 },
  stravaBtn: {},
  stravaConnected: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  stravaAthleteLabel: { fontSize: 12 },
  stravaAthleteName: { fontSize: 14, fontWeight: '700' },
  syncStatus: { fontSize: 12, padding: 8, borderRadius: 6, marginBottom: 10 },
  stravaBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  syncBtn: { flex: 1 },
  disconnectBtn: {},
  stravaNote: { fontSize: 11, fontStyle: 'italic' },

  aboutCard: { borderRadius: 12, padding: 14 },
  aboutTitle: { fontWeight: '700', marginBottom: 8 },
  aboutText: { lineHeight: 20, fontSize: 12 },
  resetBtn: { marginTop: 24 },
});
