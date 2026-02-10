import {useEffect, useState} from 'react';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Hook que monitora o status da conexão de rede
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    // Obter estado inicial
    NetInfo.fetch().then(state => {
      updateNetworkStatus(state);
    });

    // Monitorar mudanças
    const unsubscribe = NetInfo.addEventListener(state => {
      updateNetworkStatus(state);
    });

    return () => unsubscribe();
  }, []);

  function updateNetworkStatus(state: NetInfoState) {
    const status: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    };

    setNetworkStatus(status);

    // Log das mudanças
    if (!status.isConnected) {
      console.log('🔴 OFFLINE - Sem conexão');
    } else if (status.isInternetReachable === false) {
      console.log('🟡 CONECTADO mas sem internet');
    } else {
      console.log('🟢 ONLINE -', status.type);
    }
  }

  return networkStatus;
}
