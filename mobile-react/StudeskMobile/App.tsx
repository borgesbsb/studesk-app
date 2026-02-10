import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {useSyncOnline} from './src/hooks/useSyncOnline';
import {OfflineIndicator} from './src/components/OfflineIndicator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Sincroniza automaticamente quando voltar online
  useSyncOnline();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <OfflineIndicator />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
