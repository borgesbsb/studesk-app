import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import materialService, {MaterialEstudo} from '../services/material.service';
import mobileTextService from '../services/mobile-text.service';
import videoService, {DownloadProgress} from '../services/video.service';
import {getCurrentApiUrl} from '../services/api';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const VIDEO_CARD_WIDTH = SCREEN_WIDTH * 0.4;
const VIDEO_CARD_HEIGHT = VIDEO_CARD_WIDTH * 0.75;
const PDF_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding each side + 16px gap
const PDF_CARD_HEIGHT = PDF_CARD_WIDTH * 1.33; // ~3:4 aspect ratio (book cover)

type RootStackParamList = {
  DisciplinaDetail: {
    disciplinaId: string;
    disciplinaNome: string;
    disciplinaCor?: string;
  };
  MaterialReader: {
    materialId: string;
    materialNome: string;
    disciplinaCor?: string;
  };
  VideoPlayer: {
    materialId: string;
    materialNome: string;
    tempoAssistido?: number;
    duracao?: number;
  };
};

type DisciplinaDetailRouteProp = RouteProp<
  RootStackParamList,
  'DisciplinaDetail'
>;
type DisciplinaDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DisciplinaDetail'
>;

interface VideoSection {
  title: string;
  sortKey: string;
  videos: MaterialEstudo[];
}

/**
 * Extrai o prefixo "Aula XX" do nome do vídeo
 */
function extractAulaPrefix(nome: string): string {
  const match = nome.match(/^(Aula\s+\d+)/i);
  return match ? match[1] : 'Outros';
}

/**
 * Extrai o título curto do vídeo (remove "Aula XX - NNN-")
 */
function extractVideoTitle(nome: string): string {
  // Remove "Aula XX - NN-" ou "Aula XX - NN-"
  const cleaned = nome.replace(/^Aula\s+\d+\s*-\s*\d+-?/i, '');
  // Substitui hifens por espaços e limpa
  return cleaned.replace(/-/g, ' ').trim() || nome;
}

/**
 * Extrai número sequencial do vídeo para ordenação
 */
function extractVideoOrder(nome: string): number {
  const match = nome.match(/^Aula\s+\d+\s*-\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 999;
}

export default function DisciplinaDetailScreen() {
  const route = useRoute<DisciplinaDetailRouteProp>();
  const navigation = useNavigation<DisciplinaDetailNavigationProp>();
  const {disciplinaId, disciplinaNome, disciplinaCor} = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingMaterials, setDownloadingMaterials] = useState<Set<string>>(new Set());
  const [materiais, setMateriais] = useState<MaterialEstudo[]>([]);
  const [activeTab, setActiveTab] = useState<'pdfs' | 'videos'>('pdfs');
  const [cachedMaterials, setCachedMaterials] = useState<Set<string>>(new Set());

  // PDF infinite scroll
  const ITEMS_PER_PAGE = 10;
  const [pdfDisplayCount, setPdfDisplayCount] = useState(ITEMS_PER_PAGE);

  // Video-specific states
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  const [downloadedVideos, setDownloadedVideos] = useState<Set<string>>(new Set());
  const [videoDownloadProgress, setVideoDownloadProgress] = useState<Record<string, number>>({});
  const SECTIONS_PER_PAGE = 3;
  const [videoSectionDisplayCount, setVideoSectionDisplayCount] = useState(SECTIONS_PER_PAGE);

  const loadMateriais = useCallback(async () => {
    try {
      console.log('📚 Carregando materiais da disciplina:', disciplinaId);
      const data = await materialService.buscarPorDisciplina(disciplinaId);
      console.log('✅ Materiais carregados:', data.length);
      setMateriais(data);

      // Verificar quais PDFs estão em cache
      const pdfMaterials = data.filter(m => m.tipo === 'PDF');
      const cached = new Set<string>();
      for (const material of pdfMaterials) {
        const isCached = await mobileTextService.isCached(material.id);
        if (isCached) {
          cached.add(material.id);
        }
      }
      setCachedMaterials(cached);

      // Verificar quais vídeos estão baixados
      const videoMaterials = data.filter(m => m.tipo === 'VIDEO');
      const downloaded = new Set<string>();
      for (const material of videoMaterials) {
        const isDownloaded = await videoService.isDownloaded(material.id);
        if (isDownloaded) {
          downloaded.add(material.id);
        }
      }
      setDownloadedVideos(downloaded);

      console.log('💾 PDFs em cache:', cached.size, '| Vídeos baixados:', downloaded.size);
    } catch (error) {
      console.error('❌ Erro ao carregar materiais:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [disciplinaId]);

  useEffect(() => {
    loadMateriais();
  }, [loadMateriais]);

  // Reload when returning from VideoPlayer
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!loading) {
        loadMateriais();
      }
    });
    return unsubscribe;
  }, [navigation, loading, loadMateriais]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPdfDisplayCount(ITEMS_PER_PAGE);
    setVideoSectionDisplayCount(SECTIONS_PER_PAGE);
    await loadMateriais();
  }, [loadMateriais]);

  // Agrupar vídeos por "Aula XX"
  const videoSections = useMemo((): VideoSection[] => {
    const videos = materiais.filter(m => m.tipo === 'VIDEO');
    const groups: Record<string, MaterialEstudo[]> = {};

    for (const video of videos) {
      const prefix = extractAulaPrefix(video.nome);
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(video);
    }

    // Ordenar vídeos dentro de cada grupo pelo número sequencial
    const sections: VideoSection[] = Object.entries(groups).map(([title, vids]) => ({
      title,
      sortKey: title === 'Outros' ? 'zzz' : title.replace(/\D/g, '').padStart(5, '0'),
      videos: vids.sort((a, b) => extractVideoOrder(a.nome) - extractVideoOrder(b.nome)),
    }));

    // Ordenar seções por número da aula
    return sections.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [materiais]);

  const totalVideos = useMemo(() => materiais.filter(m => m.tipo === 'VIDEO').length, [materiais]);

  // Download do texto formatado para cache (PDFs)
  const handleDownloadMaterial = useCallback(async (materialId: string, materialNome: string) => {
    setDownloadingMaterials(prev => new Set(prev).add(materialId));
    try {
      await mobileTextService.buscarTextoFormatado(materialId, true);
      setCachedMaterials(prev => new Set(prev).add(materialId));
      Alert.alert('Sucesso', `"${materialNome}" baixado para leitura offline!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível baixar o material.');
    } finally {
      setDownloadingMaterials(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
    }
  }, []);

  // Excluir texto do cache (PDFs)
  const handleDeleteCache = useCallback(async (materialId: string, materialNome: string) => {
    Alert.alert(
      'Excluir do cache',
      `Deseja remover "${materialNome}" do cache?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileTextService.clearCache(materialId);
              setCachedMaterials(prev => {
                const newSet = new Set(prev);
                newSet.delete(materialId);
                return newSet;
              });
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir do cache.');
            }
          },
        },
      ]
    );
  }, []);

  // Download de vídeo
  const handleDownloadVideo = useCallback(async (materialId: string, materialNome: string) => {
    setDownloadingVideos(prev => new Set(prev).add(materialId));
    setVideoDownloadProgress(prev => ({...prev, [materialId]: 0}));

    try {
      await videoService.downloadVideo(materialId, (progress: DownloadProgress) => {
        setVideoDownloadProgress(prev => ({...prev, [materialId]: progress.percent}));
      });
      setDownloadedVideos(prev => new Set(prev).add(materialId));
      Alert.alert('Sucesso', `"${materialNome}" baixado com sucesso!`);
    } catch (error: any) {
      Alert.alert('Erro', `Não foi possível baixar o vídeo: ${error.message}`);
    } finally {
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
      setVideoDownloadProgress(prev => {
        const newProgress = {...prev};
        delete newProgress[materialId];
        return newProgress;
      });
    }
  }, []);

  // Excluir vídeo do cache
  const handleDeleteVideo = useCallback(async (materialId: string, materialNome: string) => {
    Alert.alert(
      'Excluir vídeo',
      `Deseja remover "${materialNome}" do dispositivo?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await videoService.deleteVideo(materialId);
              setDownloadedVideos(prev => {
                const newSet = new Set(prev);
                newSet.delete(materialId);
                return newSet;
              });
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o vídeo.');
            }
          },
        },
      ]
    );
  }, []);

  const handleOpenMaterial = useCallback((material: MaterialEstudo) => {
    if (material.tipo === 'PDF') {
      navigation.navigate('MaterialReader', {
        materialId: material.id,
        materialNome: material.nome,
        disciplinaCor: disciplinaCor,
      });
    } else if (material.tipo === 'VIDEO') {
      const isDownloaded = downloadedVideos.has(material.id);
      if (isDownloaded) {
        navigation.navigate('VideoPlayer', {
          materialId: material.id,
          materialNome: material.nome,
          tempoAssistido: material.tempoAssistido || 0,
          duracao: material.duracaoSegundos || material.duracao || 0,
        });
      } else {
        Alert.alert(
          'Vídeo não baixado',
          'Baixe o vídeo primeiro para poder assisti-lo.',
          [
            {text: 'Cancelar', style: 'cancel'},
            {
              text: 'Baixar agora',
              onPress: () => handleDownloadVideo(material.id, material.nome),
            },
          ]
        );
      }
    }
  }, [navigation, disciplinaCor, downloadedVideos, handleDownloadVideo]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h${minutes}m`;
    return `${minutes}min`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // =================== RENDER HELPERS ===================

  const renderVideoCard = useCallback((material: MaterialEstudo) => {
    const isVideoDownloaded = downloadedVideos.has(material.id);
    const isVideoDownloading = downloadingVideos.has(material.id);
    const downloadPercent = videoDownloadProgress[material.id] || 0;
    const videoDuracao = material.duracaoSegundos || material.duracao || 0;
    const tempoAssistido = material.tempoAssistido || 0;
    const watchProgress = videoDuracao
      ? Math.min((tempoAssistido / videoDuracao) * 100, 100)
      : 0;

    const title = extractVideoTitle(material.nome);

    return (
      <TouchableOpacity
        key={material.id}
        style={styles.videoCard}
        onPress={() => handleOpenMaterial(material)}
        onLongPress={() => {
          if (isVideoDownloaded) {
            handleDeleteVideo(material.id, material.nome);
          } else if (!isVideoDownloading) {
            handleDownloadVideo(material.id, material.nome);
          }
        }}
        activeOpacity={0.8}>
        {/* Thumbnail area */}
        <View style={[styles.videoThumb, isVideoDownloaded && styles.videoThumbDownloaded]}>
          {/* Video thumbnail from server */}
          <Image
            source={{uri: `${getCurrentApiUrl()}/video/thumbnail/${material.id}`}}
            style={styles.videoThumbImage}
            resizeMode="cover"
          />
          {/* Overlay escuro + ícone */}
          <View style={styles.videoThumbOverlay}>
            {isVideoDownloading ? (
              <View style={styles.downloadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.downloadOverlayText}>{downloadPercent}%</Text>
              </View>
            ) : (
              <View style={styles.playCircle}>
                <Text style={styles.playIcon}>{isVideoDownloaded ? '▶' : '⬇'}</Text>
              </View>
            )}
          </View>
          {/* Badge offline */}
          {isVideoDownloaded && (
            <View style={styles.offlineDot} />
          )}
          {/* Duration badge */}
          {videoDuracao > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{formatDuration(videoDuracao)}</Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.videoProgressBar}>
          <View
            style={[
              styles.videoProgressFill,
              {
                width: `${watchProgress}%`,
                backgroundColor: watchProgress >= 95 ? '#10b981' : '#e50914',
              },
            ]}
          />
        </View>

        {/* Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.videoMeta}>
            {tempoAssistido > 0
              ? `${formatDuration(tempoAssistido)} / ${formatDuration(videoDuracao)}`
              : formatDuration(videoDuracao)
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [downloadedVideos, downloadingVideos, videoDownloadProgress, handleOpenMaterial, handleDeleteVideo, handleDownloadVideo]);

  const renderVideoSection = useCallback((section: VideoSection) => {
    const totalDuration = section.videos.reduce((acc, v) => acc + (v.duracaoSegundos || v.duracao || 0), 0);
    const totalWatched = section.videos.reduce((acc, v) => acc + (v.tempoAssistido || 0), 0);
    const sectionProgress = totalDuration > 0 ? Math.round((totalWatched / totalDuration) * 100) : 0;

    return (
      <View key={section.title} style={styles.videoSection}>
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{section.videos.length}</Text>
            </View>
            {sectionProgress > 0 && (
              <Text style={styles.sectionProgress}>{sectionProgress}%</Text>
            )}
          </View>
          <Text style={styles.sectionMeta}>
            {formatDuration(totalWatched)} / {formatDuration(totalDuration)}
          </Text>
        </View>

        {/* Horizontal scroll */}
        <FlatList
          horizontal
          data={section.videos}
          keyExtractor={item => item.id}
          renderItem={({item}) => renderVideoCard(item)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videoList}
          ItemSeparatorComponent={() => <View style={{width: 10}} />}
        />
      </View>
    );
  }, [renderVideoCard]);

  const pdfs = useMemo(() => materiais.filter(m =>
    m.tipo === 'PDF' && m.mobileText?.processingStatus === 'complete'
  ), [materiais]);
  const pdfData = useMemo(() => pdfs.slice(0, pdfDisplayCount), [pdfs, pdfDisplayCount]);

  const handleLoadMorePdfs = useCallback(() => {
    if (pdfDisplayCount < pdfs.length) {
      setPdfDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, pdfs.length));
    }
  }, [pdfDisplayCount, pdfs.length]);

  const videoSectionsData = useMemo(
    () => videoSections.slice(0, videoSectionDisplayCount),
    [videoSections, videoSectionDisplayCount],
  );

  const handleLoadMoreVideoSections = useCallback(() => {
    if (videoSectionDisplayCount < videoSections.length) {
      setVideoSectionDisplayCount(prev => Math.min(prev + SECTIONS_PER_PAGE, videoSections.length));
    }
  }, [videoSectionDisplayCount, videoSections.length]);

  const renderVideoSectionItem = useCallback(
    ({item}: {item: VideoSection}) => renderVideoSection(item),
    [renderVideoSection],
  );

  const renderPdfCard = useCallback(({item: material}: {item: MaterialEstudo}) => {
    const isCached = cachedMaterials.has(material.id);
    const isDownloading = downloadingMaterials.has(material.id);
    const totalPages = material.totalPaginas || 0;
    const pagesRead = material.paginaAtual || 0;
    const readProgress = totalPages > 0 ? Math.min((pagesRead / totalPages) * 100, 100) : 0;

    return (
      <TouchableOpacity
        style={styles.pdfCard}
        onPress={() => handleOpenMaterial(material)}
        onLongPress={() => {
          if (isCached) {
            handleDeleteCache(material.id, material.nome);
          } else if (!isDownloading) {
            handleDownloadMaterial(material.id, material.nome);
          }
        }}
        activeOpacity={0.8}>
        {/* Cover area */}
        <View style={styles.pdfCover}>
          <Text style={styles.pdfCoverIcon}>📄</Text>
          {/* Pages badge */}
          {totalPages > 0 && (
            <View style={styles.pdfPagesBadge}>
              <Text style={styles.pdfPagesBadgeText}>{totalPages} pg</Text>
            </View>
          )}
          {/* Offline dot */}
          {isCached && <View style={styles.pdfOfflineDot} />}
          {/* Download indicator */}
          {!isCached && !isDownloading && (
            <View style={styles.pdfDownloadBadge}>
              <Text style={styles.pdfDownloadBadgeText}>⬇</Text>
            </View>
          )}
          {/* Downloading indicator */}
          {isDownloading && (
            <View style={styles.pdfDownloadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.pdfProgressBar}>
          <View
            style={[
              styles.pdfProgressFill,
              {
                width: `${readProgress}%`,
                backgroundColor: readProgress >= 95 ? '#10b981' : '#d97706',
              },
            ]}
          />
        </View>

        {/* Info */}
        <View style={styles.pdfInfo}>
          <Text style={styles.pdfTitle} numberOfLines={2}>
            {material.nome}
          </Text>
          <Text style={styles.pdfMeta}>
            {pagesRead > 0
              ? `${Math.round(readProgress)}% lido`
              : totalPages > 0
              ? `${totalPages} páginas`
              : formatFileSize(material.tamanho)
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [cachedMaterials, downloadingMaterials, handleOpenMaterial, handleDeleteCache, handleDownloadMaterial]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.disciplinaCor,
              {backgroundColor: disciplinaCor || '#94a3b8'},
            ]}
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {disciplinaNome}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pdfs' && styles.activeTab]}
          onPress={() => setActiveTab('pdfs')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'pdfs' && styles.activeTabText,
            ]}>
            PDFs ({pdfs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'videos' && styles.activeTabText,
            ]}>
            Videos ({totalVideos})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab PDFs - Dark theme grid with infinite scroll */}
      {activeTab === 'pdfs' && (
        <FlatList
          data={pdfData}
          numColumns={2}
          keyExtractor={item => item.id}
          renderItem={renderPdfCard}
          columnWrapperStyle={styles.pdfRow}
          contentContainerStyle={styles.pdfListContent}
          onEndReached={handleLoadMorePdfs}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhum PDF disponível para esta disciplina.
              </Text>
            </View>
          }
          ListFooterComponent={
            pdfDisplayCount < pdfs.length ? (
              <ActivityIndicator size="small" color="#6b7280" style={{marginVertical: 16}} />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Tab Vídeos - Netflix style with infinite scroll */}
      {activeTab === 'videos' && (
        <FlatList
          data={videoSectionsData}
          keyExtractor={item => item.title}
          renderItem={renderVideoSectionItem}
          contentContainerStyle={styles.videosListContent}
          onEndReached={handleLoadMoreVideoSections}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhum vídeo disponível para esta disciplina.
              </Text>
            </View>
          }
          ListFooterComponent={
            videoSectionDisplayCount < videoSections.length ? (
              <ActivityIndicator size="small" color="#6b7280" style={{marginVertical: 16}} />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1115',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1d24',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2d35',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disciplinaCor: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1d24',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2d35',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#e50914',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8a8d95',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  videosListContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },

  // ========== PDFs Dark Theme Grid ==========
  pdfListContent: {
    padding: 16,
    paddingTop: 8,
  },
  pdfRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pdfCard: {
    width: PDF_CARD_WIDTH,
  },
  pdfCover: {
    width: PDF_CARD_WIDTH,
    height: PDF_CARD_HEIGHT,
    backgroundColor: '#1e2028',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pdfCoverIcon: {
    fontSize: 48,
  },
  pdfPagesBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pdfPagesBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  pdfOfflineDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  pdfDownloadBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfDownloadBadgeText: {
    fontSize: 12,
    color: '#fff',
  },
  pdfDownloadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfProgressBar: {
    height: 3,
    backgroundColor: '#2a2d35',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  pdfProgressFill: {
    height: '100%',
  },
  pdfInfo: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  pdfTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d1d5db',
    lineHeight: 16,
  },
  pdfMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8a8d95',
    textAlign: 'center',
  },

  // ========== Videos Netflix style ==========
  videoSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  sectionBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  sectionProgress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  sectionMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  videoList: {
    paddingHorizontal: 16,
  },
  videoCard: {
    width: VIDEO_CARD_WIDTH,
  },
  videoThumb: {
    width: VIDEO_CARD_WIDTH,
    height: VIDEO_CARD_HEIGHT,
    backgroundColor: '#1e2028',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoThumbDownloaded: {
    backgroundColor: '#1a2332',
  },
  videoThumbImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 18,
    color: '#fff',
  },
  downloadOverlay: {
    alignItems: 'center',
    gap: 4,
  },
  downloadOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  offlineDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  videoProgressBar: {
    height: 3,
    backgroundColor: '#2a2d35',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
  },
  videoInfo: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d1d5db',
    lineHeight: 16,
  },
  videoMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});
