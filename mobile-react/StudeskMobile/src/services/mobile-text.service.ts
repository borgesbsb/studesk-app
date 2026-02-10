import api from './api';
import offlineStorage from './offline-storage.service';
import syncQueueService from './sync-queue.service';
import NetInfo from '@react-native-community/netinfo';

export interface MobileTextData {
  id: string;
  materialId: string;
  formattedText: string;
  tokensUsed: number;
  aiModel: string;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
  totalPages: number;
  processedPages: number;
  lastProcessedPage: number;
  processingStatus: string;
  processingError: string | null;
}

class MobileTextService {
  private CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos

  /**
   * Busca texto formatado com suporte offline
   */
  async buscarTextoFormatado(materialId: string, forceRefresh = false): Promise<MobileTextData> {
    const cacheKey = `mobile-text:${materialId}`;

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<MobileTextData>(cacheKey);

      // Se offline, usar cache obrigatoriamente
      if (!netInfo.isConnected) {
        if (cached) {
          console.log('📦 Modo offline - usando texto do cache:', materialId);
          return cached;
        } else {
          throw new Error(
            'Sem conexão e sem texto em cache. Conecte-se à internet e abra este material online primeiro para poder lê-lo offline.'
          );
        }
      }

      // Online: verificar cache primeiro (se não for refresh forçado)
      if (!forceRefresh && cached) {
        console.log('✅ Texto carregado do cache:', materialId);

        // Buscar atualização em background (não aguarda)
        this.buscarAtualizacaoBackground(materialId, cacheKey).catch(err =>
          console.log('⚠️ Erro ao atualizar cache em background:', err.message)
        );

        return cached;
      }

      // Buscar da API
      console.log('📖 [DEBUG] Buscando texto formatado da API:', materialId);
      console.log('📖 [DEBUG] Cache key:', cacheKey);
      const response = await api.get(`/pdf/${materialId}/mobile-text`);
      const textData = response.data.data;
      console.log('📖 [DEBUG] Texto recebido - tamanho:', JSON.stringify(textData).length, 'bytes');

      // Salvar no cache
      console.log('💾 [DEBUG] Tentando salvar no cache...');
      try {
        await offlineStorage.set(cacheKey, textData, this.CACHE_DURATION);
        console.log('✅ [DEBUG] Texto formatado armazenado em cache com sucesso');

        // Verificar se foi salvo
        const verificacao = await offlineStorage.get(cacheKey);
        console.log('🔍 [DEBUG] Verificação: cache salvo?', verificacao ? 'SIM' : 'NÃO');
      } catch (cacheError) {
        console.error('❌ [DEBUG] Erro ao salvar cache:', cacheError);
        throw cacheError;
      }

      return textData;
    } catch (error: any) {
      // Se erro na API mas tem cache, retornar cache
      const cached = await offlineStorage.get<MobileTextData>(cacheKey);
      if (cached) {
        console.log('⚠️ Erro na API, usando cache:', error.response?.data || error.message);
        return cached;
      }

      console.error('❌ Erro ao buscar texto formatado:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca atualização em background sem bloquear UI
   */
  private async buscarAtualizacaoBackground(materialId: string, cacheKey: string): Promise<void> {
    try {
      const response = await api.get(`/pdf/${materialId}/mobile-text`);
      const textData = response.data.data;
      await offlineStorage.set(cacheKey, textData, this.CACHE_DURATION);
      console.log('🔄 Cache atualizado em background:', materialId);
    } catch (error) {
      // Silenciar erros de background
    }
  }


  async isCached(materialId: string): Promise<boolean> {
    try {
      const cacheKey = `mobile-text:${materialId}`;
      const cached = await offlineStorage.get<MobileTextData>(cacheKey);
      return cached !== null;
    } catch (error) {
      return false;
    }
  }

  async clearCache(materialId?: string): Promise<void> {
    try {
      if (materialId) {
        // Limpar cache de um material específico
        const cacheKey = `mobile-text:${materialId}`;
        await offlineStorage.remove(cacheKey);
        console.log('🗑️ Cache removido:', materialId);
      } else {
        // Limpar todo o cache de textos
        const allKeys = await offlineStorage.getAllKeys();
        const textKeys = allKeys.filter(key => key.startsWith('mobile-text:'));
        for (const key of textKeys) {
          await offlineStorage.remove(key);
        }
        console.log('🗑️ Todo o cache de textos removido');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Atualiza progresso com suporte offline (usa fila de sincronização)
   */
  async atualizarProgresso(materialId: string, paginaAtual: number): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Online: enviar diretamente
        console.log('📊 Atualizando progresso de leitura:', materialId, paginaAtual);
        await api.post(`/material/${materialId}/progress`, {
          paginasLidas: paginaAtual,
        });
        console.log('✅ Progresso atualizado');
      } else {
        // Offline: adicionar à fila de sincronização
        console.log('📴 Offline - adicionando progresso à fila:', materialId, paginaAtual);
        await syncQueueService.addToQueue('progress', materialId, {
          paginasLidas: paginaAtual,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar progresso:', error.response?.data || error.message);

      // Se falhou online, adicionar à fila
      try {
        await syncQueueService.addToQueue('progress', materialId, {
          paginasLidas: paginaAtual,
        });
        console.log('📥 Progresso adicionado à fila para sincronização posterior');
      } catch (queueError) {
        console.error('❌ Erro ao adicionar à fila:', queueError);
      }
    }
  }

  /**
   * Registra tempo de estudo com suporte offline (usa fila de sincronização)
   */
  async registrarTempoEstudo(materialId: string, tempoSegundos: number, paginaAtual: number): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Online: enviar diretamente
        console.log('⏱️ Registrando tempo de estudo:', materialId, tempoSegundos, paginaAtual);
        await api.post(`/material/${materialId}/historico-leitura`, {
          paginaAtual,
          tempoLeituraSegundos: tempoSegundos,
        });
        console.log('✅ Tempo de estudo registrado');
      } else {
        // Offline: adicionar à fila de sincronização
        console.log('📴 Offline - adicionando tempo à fila:', materialId, tempoSegundos);
        await syncQueueService.addToQueue('historico', materialId, {
          paginaAtual,
          tempoLeituraSegundos: tempoSegundos,
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao registrar tempo de estudo:', error.response?.data || error.message);

      // Se falhou online, adicionar à fila
      try {
        await syncQueueService.addToQueue('historico', materialId, {
          paginaAtual,
          tempoLeituraSegundos: tempoSegundos,
        });
        console.log('📥 Tempo de estudo adicionado à fila para sincronização posterior');
      } catch (queueError) {
        console.error('❌ Erro ao adicionar à fila:', queueError);
      }
    }
  }
}

export default new MobileTextService();
