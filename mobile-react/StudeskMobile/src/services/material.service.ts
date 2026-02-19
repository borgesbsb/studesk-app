import {api} from './api';
import offlineStorage from './offline-storage.service';
import NetInfo from '@react-native-community/netinfo';

export interface MaterialEstudo {
  id: string;
  nome: string;
  tipo: 'PDF' | 'VIDEO' | 'OUTRO';
  url: string;
  tamanho?: number;
  duracao?: number;
  duracaoSegundos?: number;
  totalPaginas?: number;
  paginaAtual?: number;
  paginasLidas?: number;
  tempoAssistido?: number;
  googleDriveFileId?: string;
  arquivoVideoUrl?: string;
  disciplinas?: {
    id: string;
    nome: string;
    cor?: string;
  }[];
  mobileText?: {
    processingStatus: string;
  } | null;
  createdAt: string;
}

export interface ListarMateriaisResponse {
  data: MaterialEstudo[];
  total: number;
}

class MaterialService {
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Lista todos os materiais do usuário com suporte offline
   */
  async listar(): Promise<MaterialEstudo[]> {
    const cacheKey = 'materiais:all';

    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        try {
          console.log('📚 Buscando materiais da API...');
          const response = await api.get<ListarMateriaisResponse>('/materiais');
          const materiais = response.data.data || [];

          await offlineStorage.set(cacheKey, materiais, this.CACHE_TTL);
          console.log('✅ Materiais recebidos e salvos no cache:', materiais.length);

          return materiais;
        } catch (apiError) {
          console.error('❌ Erro ao buscar da API:', apiError);

          const cached = await offlineStorage.getEvenIfExpired<MaterialEstudo[]>(cacheKey);
          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<MaterialEstudo[]>(cacheKey);
        if (cached) {
          console.log('📦 Modo offline - usando cache:', cached.length, 'materiais');
          return cached;
        } else {
          throw new Error(
            'Sem conexão e sem dados em cache. Conecte-se à internet para ver seus materiais.'
          );
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar materiais:', error);
      throw error;
    }
  }

  /**
   * Busca materiais de uma disciplina específica com suporte offline
   */
  async buscarPorDisciplina(disciplinaId: string): Promise<MaterialEstudo[]> {
    const cacheKey = `materiais:disciplina:${disciplinaId}`;

    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        try {
          console.log('📚 Buscando materiais da disciplina:', disciplinaId);
          const response = await api.get<{data: MaterialEstudo[]}>(
            `/disciplinas/${disciplinaId}/materiais`
          );

          const materiais = response.data.data || [];
          await offlineStorage.set(cacheKey, materiais, this.CACHE_TTL);

          console.log('✅ Materiais da disciplina encontrados:', materiais.length);
          return materiais;
        } catch (apiError) {
          console.error('❌ Erro ao buscar da API:', apiError);

          const cached = await offlineStorage.getEvenIfExpired<MaterialEstudo[]>(cacheKey);
          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<MaterialEstudo[]>(cacheKey);
        if (cached) {
          console.log('📦 Modo offline - usando cache:', cached.length, 'materiais');
          return cached;
        } else {
          throw new Error(
            'Sem conexão e sem dados em cache. Conecte-se à internet para ver os materiais.'
          );
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar materiais da disciplina:', error);
      throw error;
    }
  }

  /**
   * Busca um material específico por ID com suporte offline
   */
  async buscarPorId(id: string): Promise<MaterialEstudo> {
    const cacheKey = `material:${id}`;

    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        try {
          console.log('📄 Buscando material:', id);
          const response = await api.get<{data: MaterialEstudo}>(`/materiais/${id}`);

          const material = response.data.data;
          await offlineStorage.set(cacheKey, material, this.CACHE_TTL);

          console.log('✅ Material encontrado:', material.nome);
          return material;
        } catch (apiError) {
          console.error('❌ Erro ao buscar da API:', apiError);

          const cached = await offlineStorage.getEvenIfExpired<MaterialEstudo>(cacheKey);
          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<MaterialEstudo>(cacheKey);
        if (cached) {
          console.log('📦 Modo offline - usando cache:', cached.nome);
          return cached;
        } else {
          throw new Error(
            'Sem conexão e sem dados em cache. Conecte-se à internet para ver este material.'
          );
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar material:', error);
      throw error;
    }
  }

  /**
   * Limpa cache de materiais
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await offlineStorage.getAllKeys();
      const materialKeys = keys.filter(
        key => key.startsWith('materiais:') || key.startsWith('material:')
      );

      for (const key of materialKeys) {
        await offlineStorage.remove(key);
      }

      console.log('🗑️ Cache de materiais limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }
}

export default new MaterialService();
