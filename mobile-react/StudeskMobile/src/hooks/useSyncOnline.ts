import {useEffect, useRef} from 'react';
import NetInfo from '@react-native-community/netinfo';
import syncQueueService from '../services/sync-queue.service';

/**
 * Hook que detecta quando o app volta online e sincroniza automaticamente
 */
export function useSyncOnline() {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('📡 Estado da rede:', state.isConnected ? 'Online' : 'Offline');

      // Se voltou online e não está sincronizando
      if (state.isConnected && !isSyncingRef.current) {
        syncData();
      }
    });

    // Cleanup
    return () => unsubscribe();
  }, []);

  async function syncData() {
    try {
      isSyncingRef.current = true;

      const queueSize = await syncQueueService.getQueueSize();
      if (queueSize === 0) {
        console.log('📤 Nada para sincronizar');
        return;
      }

      console.log(`📤 Sincronizando ${queueSize} itens pendentes...`);

      const result = await syncQueueService.syncAll();

      if (result.success > 0) {
        console.log(`✅ ${result.success} itens sincronizados com sucesso`);
      }

      if (result.failed > 0) {
        console.warn(`⚠️ ${result.failed} itens falharam na sincronização`);
      }
    } catch (error) {
      console.error('❌ Erro durante sincronização:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }

  return {syncData};
}
