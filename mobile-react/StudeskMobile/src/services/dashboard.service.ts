import api from './api';
import offlineStorage from './offline-storage.service';
import NetInfo from '@react-native-community/netinfo';

export interface DiaEvolucao {
  dia: string;
  data: string;
  minutosPlanejados: number;
  horasRealizadas: number;
  questoesPlanejadas: number;
  questoesRealizadas: number;
}

export interface DisciplinaCiclo {
  id: string;
  nome: string;
  cor?: string;
  minutosPlanejados: number;
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
  minutosPlanejados: number;
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

export interface MaterialAdmin {
  id: string;
  nome: string;
  tipo: 'PDF' | 'VIDEO';
  paginasLidas: number;
  totalPaginas: number;
  tempoAssistido: number | null;
  duracaoSegundos: number | null;
}

export interface MateriaDoDia {
  id: string;
  disciplinaId: string;
  disciplinaNome: string;
  disciplinaCor?: string;
  minutosPlanejados: number;
  horasRealizadas: number;
  tempoRealEstudo: number;
  tempoSessoesPdf: number;
  concluida: boolean;
  materialNome?: string;
  questoesPlanejadas: number;
  questoesRealizadas: number;
  prioridade: number;
  observacoes?: string;
  assuntos?: string;
  materiaisAdmin: MaterialAdmin[];
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

          const cached = await offlineStorage.getEvenIfExpired<DashboardStats>(cacheKey);
          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<DashboardStats>(cacheKey);
        if (cached) {
          console.log('📦 Modo offline - usando cache das estatísticas');
          return cached;
        } else {
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

          const cached = await offlineStorage.getEvenIfExpired<MateriaDoDia[]>(cacheKey);
          if (cached) {
            console.log('⚠️ Usando cache devido a erro na API');
            return cached;
          }

          throw apiError;
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<MateriaDoDia[]>(cacheKey);
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
          const cached = await offlineStorage.getEvenIfExpired<EvolucaoCiclo>(cacheKey);
          return cached || null;
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<EvolucaoCiclo>(cacheKey);
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
          const cached = await offlineStorage.getEvenIfExpired<AgendaMensal>(cacheKey);
          return cached || {mes, ano, dias: {}};
        }
      } else {
        const cached = await offlineStorage.getEvenIfExpired<AgendaMensal>(cacheKey);
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
