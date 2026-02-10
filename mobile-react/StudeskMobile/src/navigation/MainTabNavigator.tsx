import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import TodayScreen from '../screens/TodayScreen';
import AgendaScreen from '../screens/AgendaScreen';
import DisciplinasScreen from '../screens/DisciplinasScreen';
import StudyPlanScreen from '../screens/StudyPlanScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type MainTabParamList = {
  Today: undefined;
  Agenda: undefined;
  Disciplinas: undefined;
  StudyPlan: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e50914',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#1a1d24',
          borderTopWidth: 1,
          borderTopColor: '#2a2d35',
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 12,
          height: Math.max(insets.bottom, 8) + 68,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },
      }}>
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: 'Hoje',
          tabBarIcon: ({color, size, focused}) => (
            <MaterialCommunityIcons
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({color, size, focused}) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-month' : 'calendar-month-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Disciplinas"
        component={DisciplinasScreen}
        options={{
          tabBarLabel: 'Disciplinas',
          tabBarIcon: ({color, size, focused}) => (
            <MaterialCommunityIcons
              name={focused ? 'book-open-page-variant' : 'book-open-page-variant-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StudyPlan"
        component={StudyPlanScreen}
        options={{
          tabBarLabel: 'Plano',
          tabBarIcon: ({color, size, focused}) => (
            <MaterialCommunityIcons
              name={focused ? 'clipboard-check' : 'clipboard-check-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({color, size, focused}) => (
            <MaterialCommunityIcons
              name={focused ? 'account-circle' : 'account-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
