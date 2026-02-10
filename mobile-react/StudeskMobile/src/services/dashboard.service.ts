import api from './api';
import offlineStorage from './offline-storage.service';
import NetInfo from '@react-native-community/netinfo';

export interface DiaEvolucao {
  dia: string;
  data: string;
  horasPlanejadas: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export interface DisciplinaCiclo {
  id: string;
  nome: string;
  cor?: string;
  horasPlanejadas: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export interface EvolucaoCiclo {
  dias: DiaEvolucao[];
  disciplinas: DisciplinaCiclo[];
  nomeCiclo: string;
  dataInicio: string;
  dataFim: string;
}

export interface DashboardStats {
  totalMateriais: number;
  totalDisciplinas: number;
  materiaisRecentes: Array<{
    id: string;
    nome: string;
    paginaAtual: number;
    totalPaginas: number;
    createdAt: string;
  }>;
  tempoEstudadoHoje: number;
}

export interface DisciplinaAgenda {
  disciplinaId: string;
  nome: string;
  cor: string | null;
  horasPlanejadas: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
  concluida: boolean;
}

export interface AgendaMensal {
  mes: number;
  ano: number;
  dias: Record<string, DisciplinaAgenda[]>;
}

export interface MateriaDoDia {
  id: string;
  disciplinaId: string;
  disciplinaNome: string;
  disciplinaCor?: string;
  horasPlanejadas: number;
  horasRealizadas: number;
  tempoRealEstudo: number;
  tempoSessoesPdf: number;
  concluida: boolean;
  materialNome?: string;
  questoesPlanejadas: number;
  questoesRealizadas: number;
  prioridade: number;
  observacoes?: string;
}

class DashboardService {
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutos (dados do dashboard mudam com frequência)

  /**
   * Obtém estatísticas do dashboard com suporte offline
   */
  async getStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard:stats';

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<DashboardStats>(cacheKey);

      if (netInfo.isConnected) {
        try {
          console.log('📊 Buscando estatísticas da API...');
          const response = await api.get('/dashboard/stats');
          const stats = response.data.data;

          await offlineStorage.set(cacheKey, stats, this.CACHE_TTL);
          console.log('✅ Estatísticas recebidas e salvas no cache');

          return stats;
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
          console.log('📦 Modo offline - usando cache das estatísticas');
          return cached;
        } else {
          // Retornar dados vazios em vez de erro
          console.log('⚠️ Modo offline sem cache - retornando dados vazios');
          return {
            totalMateriais: 0,
            totalDisciplinas: 0,
            materiaisRecentes: [],
            tempoEstudadoHoje: 0,
          };
        }
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Obtém matérias do dia com suporte offline
   */
  async getMateriasDoDia(data?: Date): Promise<MateriaDoDia[]> {
    const dateKey = data ? data.toISOString().split('T')[0] : 'today';
    const cacheKey = `dashboard:materias-do-dia:${dateKey}`;

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<MateriaDoDia[]>(cacheKey);

      if (netInfo.isConnected) {
        try {
          console.log('📅 Buscando matérias do dia da API...');
          const response = await api.get('/dashboard/materias-do-dia', {
            params: data ? {data: data.toISOString()} : undefined,
          });
          const materias = response.data.data;

          await offlineStorage.set(cacheKey, materias, this.CACHE_TTL);
          console.log('✅ Matérias do dia recebidas:', materias.length);

          return materias;
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
          console.log('📦 Modo offline - usando cache:', cached.length, 'matérias');
          return cached;
        } else {
          console.log('⚠️ Modo offline sem cache - retornando lista vazia');
          return [];
        }
      }
    } catch (error) {
      console.error('Erro ao buscar matérias do dia:', error);
      throw error;
    }
  }

  /**
   * Obtém evolução do ciclo atual com suporte offline
   */
  async getEvolucaoCiclo(): Promise<EvolucaoCiclo | null> {
    const cacheKey = 'dashboard:evolucao-ciclo';

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<EvolucaoCiclo>(cacheKey);

      if (netInfo.isConnected) {
        try {
          console.log('📈 Buscando evolução do ciclo da API...');
          const response = await api.get('/dashboard/evolucao-ciclo');
          const evolucao = response.data.data;

          await offlineStorage.set(cacheKey, evolucao, this.CACHE_TTL);
          console.log('✅ Evolução do ciclo recebida');

          return evolucao;
        } catch (apiError) {
          console.error('❌ Erro ao buscar evolução:', apiError);
          if (cached) return cached;
          return null;
        }
      } else {
        return cached || null;
      }
    } catch (error) {
      console.error('Erro ao buscar evolução do ciclo:', error);
      return null;
    }
  }

  /**
   * Obtém agenda mensal com suporte offline
   */
  async getAgenda(mes: number, ano: number): Promise<AgendaMensal> {
    const cacheKey = `dashboard:agenda:${ano}-${mes}`;

    try {
      const netInfo = await NetInfo.fetch();
      const cached = await offlineStorage.get<AgendaMensal>(cacheKey);

      if (netInfo.isConnected) {
        try {
          const response = await api.get('/dashboard/agenda', {
            params: {mes, ano},
          });
          const agenda = response.data.data;

          await offlineStorage.set(cacheKey, agenda, this.CACHE_TTL);
          return agenda;
        } catch (apiError) {
          console.error('Erro ao buscar agenda:', apiError);
          if (cached) return cached;
          return {mes, ano, dias: {}};
        }
      } else {
        return cached || {mes, ano, dias: {}};
      }
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
      return {mes, ano, dias: {}};
    }
  }

  /**
   * Limpa cache do dashboard
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await offlineStorage.getAllKeys();
      const dashboardKeys = keys.filter(key => key.startsWith('dashboard:'));

      for (const key of dashboardKeys) {
        await offlineStorage.remove(key);
      }

      console.log('🗑️ Cache do dashboard limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }
}

export default new DashboardService();
