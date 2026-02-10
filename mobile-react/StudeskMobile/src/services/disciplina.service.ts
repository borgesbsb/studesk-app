import api from './api';
import offlineStorage from './offline-storage.service';
import NetInfo from '@react-native-community/netinfo';

export interface Disciplina {
  id: string;
  nome: string;
  cor?: string;
  createdAt: string;
  _count?: {
    materiais: number;
  };
}

class DisciplinaService {
  private CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Lista todas as disciplinas com suporte offline
   */
  async listar(): Promise<Disciplina[]> {
    const cacheKey = 'disciplinas:all';

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<Disciplina[]>(cacheKey);

      if (netInfo.isConnected) {
        try {
          console.log('📚 Buscando disciplinas da API...');
          const response = await api.get('/disciplinas');
          const disciplinas = response.data.data || [];

          await offlineStorage.set(cacheKey, disciplinas, this.CACHE_TTL);
          console.log('✅ Disciplinas recebidas e salvas no cache:', disciplinas.length);

          return disciplinas;
        } catch (apiError) {
          console.error('❌ Erro ao buscar da API:', apiError);

          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        if (cached) {
          console.log('📦 Modo offline - usando cache:', cached.length, 'disciplinas');
          return cached;
        } else {
          throw new Error(
            'Sem conexão e sem dados em cache. Conecte-se à internet para ver suas disciplinas.'
          );
        }
      }
    } catch (error) {
      console.error('Erro ao listar disciplinas:', error);
      throw error;
    }
  }

  /**
   * Busca uma disciplina específica por ID com suporte offline
   */
  async buscarPorId(id: string): Promise<Disciplina> {
    const cacheKey = `disciplina:${id}`;

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<Disciplina>(cacheKey);

      if (netInfo.isConnected) {
        try {
          console.log('📚 Buscando disciplina:', id);
          const response = await api.get(`/disciplinas/${id}`);
          const disciplina = response.data.data;

          await offlineStorage.set(cacheKey, disciplina, this.CACHE_TTL);
          console.log('✅ Disciplina encontrada:', disciplina.nome);

          return disciplina;
        } catch (apiError) {
          console.error('❌ Erro ao buscar da API:', apiError);

          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        if (cached) {
          console.log('📦 Modo offline - usando cache:', cached.nome);
          return cached;
        } else {
          throw new Error(
            'Sem conexão e sem dados em cache. Conecte-se à internet para ver esta disciplina.'
          );
        }
      }
    } catch (error) {
      console.error('Erro ao buscar disciplina:', error);
      throw error;
    }
  }

  /**
   * Limpa cache de disciplinas
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await offlineStorage.getAllKeys();
      const disciplinaKeys = keys.filter(
        key => key.startsWith('disciplinas:') || key.startsWith('disciplina:')
      );

      for (const key of disciplinaKeys) {
        await offlineStorage.remove(key);
      }

      console.log('🗑️ Cache de disciplinas limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }
}

export default new DisciplinaService();
