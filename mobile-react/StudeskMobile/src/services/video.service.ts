import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
import syncQueueService from './sync-queue.service';
import NetInfo from '@react-native-community/netinfo';

const VIDEOS_DIR = `${RNFS.DocumentDirectoryPath}/videos`;
const VIDEO_META_PREFIX = '@studesk:video_meta:';

interface VideoMeta {
  materialId: string;
  fileName: string;
  fileSize: number;
  downloadedAt: number;
}

export interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  percent: number;
}

// Mínimo de espaço livre em disco para iniciar download (200MB)
const MIN_FREE_SPACE_BYTES = 200 * 1024 * 1024;

class VideoService {
  /**
   * Garante que o diretório de vídeos existe
   */
  private async ensureVideosDir(): Promise<void> {
    const exists = await RNFS.exists(VIDEOS_DIR);
    if (!exists) {
      await RNFS.mkdir(VIDEOS_DIR);
    }
  }

  /**
   * Lista todos os vídeos em cache, ordenados por downloadedAt (mais antigo primeiro)
   */
  async listCachedVideos(): Promise<VideoMeta[]> {
    const keys = await AsyncStorage.getAllKeys();
    const videoKeys = keys.filter(k => k.startsWith(VIDEO_META_PREFIX));
    const metas: VideoMeta[] = [];

    for (const key of videoKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        try {
          metas.push(JSON.parse(raw));
        } catch {}
      }
    }

    return metas.sort((a, b) => a.downloadedAt - b.downloadedAt);
  }

  /**
   * Remove o vídeo mais antigo do cache.
   * Retorna o materialId removido ou null se não havia nada.
   */
  async removeOldestVideo(excludeMaterialId?: string): Promise<string | null> {
    const videos = await this.listCachedVideos();
    const candidate = videos.find(v => v.materialId !== excludeMaterialId);

    if (!candidate) {
      return null;
    }

    console.log('🗑️ Removendo vídeo mais antigo para liberar espaço:', candidate.materialId,
      `(${(candidate.fileSize / 1024 / 1024).toFixed(1)}MB)`);
    await this.deleteVideo(candidate.materialId);
    return candidate.materialId;
  }

  /**
   * Garante espaço livre suficiente removendo vídeos antigos se necessário.
   * Não remove o vídeo que está sendo baixado (excludeMaterialId).
   */
  async ensureFreeSpace(excludeMaterialId?: string): Promise<void> {
    const freeSpace = await RNFS.getFSInfo().then(info => info.freeSpace);
    console.log(`📊 Espaço livre: ${(freeSpace / 1024 / 1024).toFixed(0)}MB`);

    if (freeSpace >= MIN_FREE_SPACE_BYTES) {
      return;
    }

    console.log('⚠️ Espaço insuficiente, liberando cache de vídeos...');
    let currentFree = freeSpace;

    while (currentFree < MIN_FREE_SPACE_BYTES) {
      const removed = await this.removeOldestVideo(excludeMaterialId);
      if (!removed) {
        console.log('⚠️ Não há mais vídeos para remover');
        break;
      }
      currentFree = await RNFS.getFSInfo().then(info => info.freeSpace);
      console.log(`📊 Espaço livre após remoção: ${(currentFree / 1024 / 1024).toFixed(0)}MB`);
    }
  }

  /**
   * Retorna o path local do vídeo
   */
  getVideoPath(materialId: string): string {
    return `${VIDEOS_DIR}/${materialId}.mp4`;
  }

  /**
   * Verifica se um vídeo já está baixado
   */
  async isDownloaded(materialId: string): Promise<boolean> {
    const path = this.getVideoPath(materialId);
    return RNFS.exists(path);
  }

  /**
   * Executa o download RNFS de fato
   */
  private async executeDownload(
    materialId: string,
    filePath: string,
    downloadUrl: string,
    token: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<{statusCode: number; bytesWritten: number}> {
    const result = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: filePath,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      begin: (res) => {
        console.log('📥 Download iniciado - Content-Length:', res.contentLength,
          `(${(res.contentLength / 1024 / 1024).toFixed(1)}MB)`);
      },
      progress: (res) => {
        const percent =
          res.contentLength > 0
            ? Math.round((res.bytesWritten / res.contentLength) * 100)
            : 0;
        if (onProgress) {
          onProgress({
            bytesWritten: res.bytesWritten,
            contentLength: res.contentLength,
            percent,
          });
        }
      },
      progressDivider: 5,
    }).promise;

    return result;
  }

  /**
   * Download do vídeo via API Google Drive.
   * Libera espaço automaticamente se necessário e retenta após falha.
   */
  async downloadVideo(
    materialId: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string> {
    await this.ensureVideosDir();

    const filePath = this.getVideoPath(materialId);

    // Obter token e URL base
    const token = await AsyncStorage.getItem('@studesk:token');
    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    const baseUrl = api.defaults.baseURL || '';
    const downloadUrl = `${baseUrl}/video/google-drive-download/${materialId}`;

    console.log('📥 Iniciando download do vídeo:', materialId);
    console.log('📥 URL:', downloadUrl);

    // Liberar espaço antes de iniciar
    await this.ensureFreeSpace(materialId);

    let result;
    try {
      result = await this.executeDownload(materialId, filePath, downloadUrl, token, onProgress);
    } catch (downloadError: any) {
      console.error('❌ Erro no download RNFS:', downloadError?.message || downloadError);

      // Limpar arquivo parcial
      const partialExists = await RNFS.exists(filePath);
      if (partialExists) {
        await RNFS.unlink(filePath);
      }

      // Tentar liberar espaço removendo vídeo mais antigo e retentar
      const removed = await this.removeOldestVideo(materialId);
      if (removed) {
        console.log('🔄 Retentando download após liberar espaço...');
        try {
          result = await this.executeDownload(materialId, filePath, downloadUrl, token, onProgress);
        } catch (retryError: any) {
          console.error('❌ Retry falhou:', retryError?.message || retryError);
          const exists = await RNFS.exists(filePath);
          if (exists) {
            await RNFS.unlink(filePath);
          }
          throw new Error(
            `Download falhou mesmo após liberar espaço: ${retryError?.message || 'erro desconhecido'}`,
          );
        }
      } else {
        throw new Error(
          `Download interrompido: ${downloadError?.message || 'erro desconhecido'}`,
        );
      }
    }

    if (result.statusCode !== 200) {
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
      }
      throw new Error(`Download falhou com status ${result.statusCode}`);
    }

    // Salvar metadados
    const meta: VideoMeta = {
      materialId,
      fileName: `${materialId}.mp4`,
      fileSize: result.bytesWritten,
      downloadedAt: Date.now(),
    };
    await AsyncStorage.setItem(
      `${VIDEO_META_PREFIX}${materialId}`,
      JSON.stringify(meta),
    );

    console.log('✅ Download concluído:', filePath, result.bytesWritten, 'bytes');
    return filePath;
  }

  /**
   * Exclui um vídeo baixado
   */
  async deleteVideo(materialId: string): Promise<void> {
    const filePath = this.getVideoPath(materialId);
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }
    await AsyncStorage.removeItem(`${VIDEO_META_PREFIX}${materialId}`);
    console.log('🗑️ Vídeo excluído:', materialId);
  }

  /**
   * Retorna metadados de um vídeo baixado
   */
  async getVideoMeta(materialId: string): Promise<VideoMeta | null> {
    const raw = await AsyncStorage.getItem(`${VIDEO_META_PREFIX}${materialId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  /**
   * Salva progresso do vídeo (tempoAssistido) com suporte offline
   */
  async salvarProgresso(
    materialId: string,
    tempoAssistido: number,
  ): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        console.log('💾 Salvando progresso do vídeo:', materialId, tempoAssistido);
        await api.post(`/material/${materialId}/progress`, {
          tempoAssistido: Math.floor(tempoAssistido),
        });
        console.log('✅ Progresso do vídeo salvo');
      } else {
        console.log('📴 Offline - adicionando progresso à fila:', materialId);
        await syncQueueService.addToQueue('progress', materialId, {
          tempoAssistido: Math.floor(tempoAssistido),
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao salvar progresso:', error.response?.data || error.message);
      try {
        await syncQueueService.addToQueue('progress', materialId, {
          tempoAssistido: Math.floor(tempoAssistido),
        });
        console.log('📥 Progresso adicionado à fila');
      } catch (queueError) {
        console.error('❌ Erro ao adicionar à fila:', queueError);
      }
    }
  }

  /**
   * Atualiza duração real do vídeo no servidor
   */
  async atualizarDuracao(
    materialId: string,
    duracaoSegundos: number,
  ): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        console.log('📐 Atualizando duração do vídeo:', materialId, duracaoSegundos);
        await api.post(`/material/${materialId}/update-duration`, {
          duracaoSegundos: Math.floor(duracaoSegundos),
        });
        console.log('✅ Duração atualizada no servidor');
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar duração:', error.response?.data || error.message);
    }
  }

  /**
   * Registra histórico de visualização com suporte offline
   */
  async registrarHistorico(
    materialId: string,
    paginaAtual: number,
    tempoLeituraSegundos: number,
  ): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        console.log('📝 Registrando histórico:', materialId, paginaAtual, tempoLeituraSegundos);
        await api.post(`/material/${materialId}/historico-leitura`, {
          paginaAtual: Math.floor(paginaAtual),
          tempoLeituraSegundos: Math.floor(tempoLeituraSegundos),
        });
        console.log('✅ Histórico registrado');
      } else {
        console.log('📴 Offline - adicionando histórico à fila:', materialId);
        await syncQueueService.addToQueue('historico', materialId, {
          paginaAtual: Math.floor(paginaAtual),
          tempoLeituraSegundos: Math.floor(tempoLeituraSegundos),
        });
      }
    } catch (error: any) {
      console.error('❌ Erro ao registrar histórico:', error.response?.data || error.message);
      try {
        await syncQueueService.addToQueue('historico', materialId, {
          paginaAtual: Math.floor(paginaAtual),
          tempoLeituraSegundos: Math.floor(tempoLeituraSegundos),
        });
        console.log('📥 Histórico adicionado à fila');
      } catch (queueError) {
        console.error('❌ Erro ao adicionar à fila:', queueError);
      }
    }
  }
}

export default new VideoService();
