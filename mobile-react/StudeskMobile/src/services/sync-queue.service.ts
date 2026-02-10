import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

interface QueueItem {
  id: string;
  type: 'progress' | 'historico';
  materialId: string;
  data: any;
  timestamp: number;
  retries: number;
}

class SyncQueueService {
  private QUEUE_KEY = '@studesk:sync-queue';
  private MAX_RETRIES = 3;
  private isSyncing = false;

  /**
   * Adiciona um item à fila de sincronização
   */
  async addToQueue(
    type: 'progress' | 'historico',
    materialId: string,
    data: any
  ): Promise<void> {
    try {
      const queue = await this.getQueue();
      const item: QueueItem = {
        id: `${type}-${materialId}-${Date.now()}`,
        type,
        materialId,
        data,
        timestamp: Date.now(),
        retries: 0,
      };

      queue.push(item);
      await this.saveQueue(queue);
      console.log('📥 Item adicionado à fila de sincronização:', item.id);
    } catch (error) {
      console.error('❌ Erro ao adicionar à fila:', error);
    }
  }

  /**
   * Obtém a fila de sincronização
   */
  private async getQueue(): Promise<QueueItem[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('❌ Erro ao ler fila:', error);
      return [];
    }
  }

  /**
   * Salva a fila de sincronização
   */
  private async saveQueue(queue: QueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('❌ Erro ao salvar fila:', error);
    }
  }

  /**
   * Sincroniza todos os itens da fila
   */
  async syncAll(): Promise<{success: number; failed: number}> {
    if (this.isSyncing) {
      console.log('⏳ Sincronização já em andamento...');
      return {success: 0, failed: 0};
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const queue = await this.getQueue();

      if (queue.length === 0) {
        console.log('✅ Fila vazia, nada para sincronizar');
        return {success: 0, failed: 0};
      }

      console.log(`🔄 Sincronizando ${queue.length} itens...`);

      const remainingQueue: QueueItem[] = [];

      for (const item of queue) {
        try {
          await this.syncItem(item);
          successCount++;
          console.log(`✅ Item sincronizado: ${item.id}`);
        } catch (error) {
          console.error(`❌ Erro ao sincronizar item ${item.id}:`, error);

          // Incrementar retries e manter na fila se ainda não excedeu o limite
          item.retries++;
          if (item.retries < this.MAX_RETRIES) {
            remainingQueue.push(item);
            console.log(`🔁 Item ${item.id} mantido na fila (tentativa ${item.retries}/${this.MAX_RETRIES})`);
          } else {
            failedCount++;
            console.error(`⛔ Item ${item.id} descartado após ${this.MAX_RETRIES} tentativas`);
          }
        }
      }

      // Salvar fila atualizada (apenas com itens que falharam e ainda têm tentativas)
      await this.saveQueue(remainingQueue);

      console.log(`🔄 Sincronização concluída: ${successCount} sucesso, ${failedCount} falhas`);
      return {success: successCount, failed: failedCount};
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sincroniza um item específico
   */
  private async syncItem(item: QueueItem): Promise<void> {
    if (item.type === 'progress') {
      // Atualizar progresso
      await api.post(`/material/${item.materialId}/progress`, item.data);
    } else if (item.type === 'historico') {
      // Salvar histórico de leitura
      await api.post(`/material/${item.materialId}/historico-leitura`, item.data);
    }
  }

  /**
   * Limpa toda a fila
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('🗑️ Fila de sincronização limpa');
    } catch (error) {
      console.error('❌ Erro ao limpar fila:', error);
    }
  }

  /**
   * Retorna o tamanho da fila
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

export default new SyncQueueService();
