import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <TabIcon name="run-fast" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar-month" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pt"
        options={{
          title: 'Recovery',
          tabBarIcon: ({ color, size }) => <TabIcon name="arm-flex" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <TabIcon name="trophy-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="account-cog" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
