import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNetworkStatus} from '../hooks/useNetworkStatus';

/**
 * Componente que exibe um banner quando o app está offline
 */
export function OfflineIndicator() {
  const networkStatus = useNetworkStatus();

  // Não mostrar nada se estiver online
  if (networkStatus.isConnected && networkStatus.isInternetReachable !== false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📴</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Modo Offline</Text>
        <Text style={styles.subtitle}>
          Você está sem conexão. Alguns recursos podem não estar disponíveis.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFA500',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FF8C00',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
