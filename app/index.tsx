import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { loadUserProfile } from '../lib/storage';

export default function Index() {
  const [dest, setDest] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile().then(profile => {
      setDest(profile?.onboardingComplete ? '/(tabs)' : '/onboarding');
    });
  }, []);

  if (!dest) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e40af' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <Redirect href={dest as any} />;
}
