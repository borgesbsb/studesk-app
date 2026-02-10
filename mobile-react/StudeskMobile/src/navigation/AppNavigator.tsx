import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuth} from '../contexts/AuthContext';
import {View, ActivityIndicator, StyleSheet, StatusBar} from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import DisciplinaDetailScreen from '../screens/DisciplinaDetailScreen';
import MaterialReaderScreen from '../screens/MaterialReaderScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  DisciplinaDetail: {
    disciplinaId: string;
    disciplinaNome: string;
    disciplinaCor?: string;
  };
  MaterialReader: {
    materialId: string;
    materialNome: string;
    disciplinaCor?: string;
  };
  VideoPlayer: {
    materialId: string;
    materialNome: string;
    tempoAssistido?: number;
    duracao?: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f1115" />
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f1115" translucent />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen
                name="DisciplinaDetail"
                component={DisciplinaDetailScreen}
              />
              <Stack.Screen
                name="MaterialReader"
                component={MaterialReaderScreen}
              />
              <Stack.Screen
                name="VideoPlayer"
                component={VideoPlayerScreen}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1115',
  },
});
