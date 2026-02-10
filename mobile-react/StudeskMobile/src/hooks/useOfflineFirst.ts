import {useState, useEffect, useCallback} from 'react';
import {useNetworkStatus} from './useNetworkStatus';
import offlineStorage from '../services/offline-storage.service';

export interface UseOfflineFirstOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  cacheTTL?: number;
  forceRefresh?: boolean;
}

export interface UseOfflineFirstResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isFromCache: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook que implementa estratégia cache-first com fallback offline
 *
 * Fluxo:
 * 1. Busca dados do cache
 * 2. Se online, busca dados da API e atualiza cache
 * 3. Se offline, usa apenas dados do cache
 */
export function useOfflineFirst<T>({
  cacheKey,
  fetchFn,
  cacheTTL,
  forceRefresh = false,
}: UseOfflineFirstOptions<T>): UseOfflineFirstResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const networkStatus = useNetworkStatus();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Tentar buscar do cache primeiro
      const cachedData = await offlineStorage.get<T>(cacheKey);

      if (cachedData && !forceRefresh) {
        console.log('📦 Usando dados do cache:', cacheKey);
        setData(cachedData);
        setIsFromCache(true);
        setLoading(false);
      }

      // 2. Se online, buscar da API e atualizar cache
      if (networkStatus.isConnected) {
        try {
          console.log('🌐 Buscando dados da API:', cacheKey);
          const freshData = await fetchFn();

          // Atualizar cache
          await offlineStorage.set(cacheKey, freshData, cacheTTL);

          // Atualizar estado
          setData(freshData);
          setIsFromCache(false);
          console.log('✅ Dados atualizados da API:', cacheKey);
        } catch (apiError) {
          console.error('❌ Erro ao buscar da API:', apiError);

          // Se já temos cache, continuar usando ele
          if (cachedData) {
            console.log('⚠️ Usando cache devido a erro na API');
            setError(apiError as Error);
          } else {
            // Se não tem cache, propagar erro
            throw apiError;
          }
        }
      } else {
        // 3. Se offline e não tem cache, mostrar erro
        if (!cachedData) {
          const offlineError = new Error(
            'Sem conexão e sem dados em cache. Conecte-se à internet para acessar estes dados.'
          );
          setError(offlineError);
          console.error('❌ Offline sem cache:', cacheKey);
        } else {
          console.log('📴 Modo offline - usando cache:', cacheKey);
        }
      }
    } catch (err) {
      setError(err as Error);
      console.error('❌ Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, cacheTTL, forceRefresh, networkStatus.isConnected]);

  // Carregar dados ao montar e quando mudar dependências
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Função para forçar refresh
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    refresh,
  };
}
