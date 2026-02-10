import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Serviço de cache offline genérico
 * Armazena dados no AsyncStorage com controle de expiração
 */
class OfflineStorageService {
  private PREFIX = '@studesk:cache:';
  private DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

  /**
   * Salva dados no cache com TTL opcional
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.PREFIX + key;
      const expiresAt = Date.now() + (ttl || this.DEFAULT_TTL);

      const cacheData = {
        data,
        expiresAt,
        cachedAt: Date.now(),
      };

      const jsonString = JSON.stringify(cacheData);
      console.log('💾 [DEBUG] Salvando cache...');
      console.log('💾 [DEBUG] Key:', cacheKey);
      console.log('💾 [DEBUG] Tamanho:', jsonString.length, 'bytes');

      await AsyncStorage.setItem(cacheKey, jsonString);
      console.log('✅ [DEBUG] AsyncStorage.setItem completou com sucesso');

      // Verificar se foi salvo
      const saved = await AsyncStorage.getItem(cacheKey);
      console.log('🔍 [DEBUG] Verificação imediata:', saved ? 'Encontrado' : 'NÃO ENCONTRADO');

      console.log('💾 Dados salvos no cache:', key);
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao salvar no cache:', error);
      console.error('❌ [DEBUG] Error type:', typeof error);
      console.error('❌ [DEBUG] Error message:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Obtém dados do cache
   * Retorna null se não existir ou estiver expirado
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.PREFIX + key;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        console.log('📭 Cache vazio para:', key);
        return null;
      }

      const cacheData = JSON.parse(cached);

      // Verificar se expirou
      if (Date.now() > cacheData.expiresAt) {
        console.log('⏰ Cache expirado para:', key);
        await this.remove(key);
        return null;
      }

      console.log('✅ Dados obtidos do cache:', key);
      return cacheData.data as T;
    } catch (error) {
      console.error('❌ Erro ao ler cache:', error);
      return null;
    }
  }

  /**
   * Remove item do cache
   */
  async remove(key: string): Promise<void> {
    try {
      const cacheKey = this.PREFIX + key;
      await AsyncStorage.removeItem(cacheKey);
      console.log('🗑️ Cache removido:', key);
    } catch (error) {
      console.error('❌ Erro ao remover cache:', error);
    }
  }

  /**
   * Limpa todo o cache
   */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🗑️ ${cacheKeys.length} itens removidos do cache`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Verifica se existe cache válido para a chave
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Obtém todas as chaves do cache
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter(key => key.startsWith(this.PREFIX))
        .map(key => key.replace(this.PREFIX, ''));
    } catch (error) {
      console.error('❌ Erro ao obter chaves do cache:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getStats(): Promise<{
    totalItems: number;
    totalSize: number;
    oldestItem: number | null;
  }> {
    try {
      const keys = await this.getAllKeys();
      let totalSize = 0;
      let oldestItem: number | null = null;

      for (const key of keys) {
        const cacheKey = this.PREFIX + key;
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
          totalSize += cached.length;

          const cacheData = JSON.parse(cached);
          if (!oldestItem || cacheData.cachedAt < oldestItem) {
            oldestItem = cacheData.cachedAt;
          }
        }
      }

      return {
        totalItems: keys.length,
        totalSize,
        oldestItem,
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return {totalItems: 0, totalSize: 0, oldestItem: null};
    }
  }

  /**
   * Remove caches expirados
   */
  async cleanExpired(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      let cleaned = 0;

      for (const key of keys) {
        const data = await this.get(key);
        if (data === null) {
          cleaned++;
        }
      }

      console.log(`🧹 ${cleaned} caches expirados removidos`);
      return cleaned;
    } catch (error) {
      console.error('❌ Erro ao limpar caches expirados:', error);
      return 0;
    }
  }
}

export default new OfflineStorageService();
