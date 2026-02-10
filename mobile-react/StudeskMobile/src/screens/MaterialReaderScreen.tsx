import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  AppState,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
} from 'react-native';

const { TTSServiceModule } = NativeModules;
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Markdown from 'react-native-markdown-display';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileTextService, {
  MobileTextData,
} from '../services/mobile-text.service';
import api from '../services/api';
import syncQueueService from '../services/sync-queue.service';

// Interface para representar uma página do texto
interface TextPage {
  id: string;
  content: string;
  pageNumber: number;
}

type RootStackParamList = {
  MaterialReader: {
    materialId: string;
    materialNome: string;
    disciplinaCor?: string;
  };
};

type MaterialReaderRouteProp = RouteProp<
  RootStackParamList,
  'MaterialReader'
>;
type MaterialReaderNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MaterialReader'
>;

export default function MaterialReaderScreen() {
  const route = useRoute<MaterialReaderRouteProp>();
  const navigation = useNavigation<MaterialReaderNavigationProp>();
  const {materialId, materialNome, disciplinaCor} = route.params;

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [textData, setTextData] = useState<MobileTextData | null>(null);

  // Cronômetro
  const [elapsedTime, setElapsedTime] = useState(0); // em segundos
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Progresso de leitura
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [readPages, setReadPages] = useState<Set<number>>(new Set());

  // Text-to-Speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [speechRate, setSpeechRate] = useState(0.5); // Velocidade de fala
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const sentencesRef = useRef<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sentenceViewRefs = useRef<Map<number, View>>(new Map());
  const currentPageContentRef = useRef<string>('');

  // Opções de velocidade disponíveis
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Dividir texto em páginas usando marcadores [PAGE_X]
  const pages = useMemo<TextPage[]>(() => {
    if (!textData?.formattedText) {
      return [];
    }

    console.log('📄 Dividindo texto em páginas...');

    // Verificar quais marcadores [PAGE_X] existem no texto
    const pageMarkers = textData.formattedText.match(/\[PAGE_\d+\]/g);
    if (pageMarkers) {
      console.log(`🏷️  Marcadores encontrados (${pageMarkers.length}):`, pageMarkers.slice(0, 10).join(', '), pageMarkers.length > 10 ? '...' : '');
    } else {
      console.warn('⚠️  NENHUM marcador [PAGE_X] encontrado no texto!');
    }

    // Split pelo marcador de página, mas mantém o marcador
    const parts = textData.formattedText.split(/(\[PAGE_\d+\])/);

    const textPages: TextPage[] = [];
    let currentPageNumber = 1; // Começa em 1 para corresponder ao PDF real
    let currentContent = '';
    let foundFirstPageMarker = false;

    for (const part of parts) {
      // Se é um marcador de página [PAGE_X]
      const pageMatch = part.match(/\[PAGE_(\d+)\]/);
      if (pageMatch) {
        // Se já temos conteúdo acumulado, salva como página
        if (currentContent.trim()) {
          textPages.push({
            id: `page-${currentPageNumber}`,
            content: currentContent.trim(),
            pageNumber: currentPageNumber,
          });
        }

        // Extrai o número da página do marcador [PAGE_X]
        currentPageNumber = parseInt(pageMatch[1], 10);
        currentContent = '';
        foundFirstPageMarker = true;
      } else if (part.trim()) {
        // Acumula conteúdo da página atual
        currentContent += part;
      }
    }

    // Adiciona última página se houver conteúdo
    if (currentContent.trim()) {
      textPages.push({
        id: `page-${currentPageNumber}`,
        content: currentContent.trim(),
        pageNumber: currentPageNumber,
      });
    }

    // Se não encontrou marcadores, trata todo texto como uma página
    if (textPages.length === 0 && textData.formattedText.trim()) {
      textPages.push({
        id: 'page-1',
        content: textData.formattedText.trim(),
        pageNumber: 1,
      });
    }

    console.log(`✅ Texto dividido em ${textPages.length} páginas`);

    // Log do mapeamento: índice -> pageNumber
    if (textPages.length > 0) {
      const mapping = textPages.map((page, idx) => `[${idx}]→P${page.pageNumber}`).join(', ');
      console.log(`📊 Mapeamento (índice→página): ${mapping.substring(0, 150)}${mapping.length > 150 ? '...' : ''}`);
    }

    return textPages;
  }, [textData?.formattedText]);

  // Carregar texto formatado
  const loadText = useCallback(async (forceReload = false) => {
    try {
      if (forceReload) {
        setReloading(true);
      } else {
        setLoading(true);
      }

      console.log('📖 Carregando texto formatado:', materialId, forceReload ? '(forçado)' : '');
      const data = await mobileTextService.buscarTextoFormatado(materialId, forceReload); // forceReload = forceRefresh no serviço
      setTextData(data);

      if (forceReload) {
        Alert.alert('Sucesso', 'Texto atualizado com sucesso!');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar texto:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar o texto. O PDF pode ainda não ter sido processado.',
        [
          {text: 'Voltar', onPress: () => navigation.goBack()},
        ]
      );
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }, [materialId, navigation]);

  // Recarregar texto do servidor
  const handleReloadText = useCallback(() => {
    Alert.alert(
      'Recarregar texto',
      'Deseja recarregar o texto do servidor? Isso substituirá o cache atual.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Recarregar', onPress: () => loadText(true)},
      ]
    );
  }, [loadText]);

  // Carregar progresso salvo do backend
  const loadSavedProgress = useCallback(async () => {
    try {
      console.log('📊 Carregando progresso salvo...');
      const response = await api.get(`/material/${materialId}/progress`);

      if (response.data.success && response.data.data) {
        const { paginasLidas } = response.data.data;

        if (paginasLidas && paginasLidas > 0) {
          // Encontrar o índice da página com o pageNumber correspondente
          const pageIndex = pages.findIndex(page => page.pageNumber === paginasLidas);

          if (pageIndex >= 0) {
            console.log(`✅ Progresso carregado: página ${paginasLidas} (índice ${pageIndex})`);

            setCurrentPageIndex(pageIndex);

            // Scroll para o topo da página
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({y: 0, animated: false});
            }, 100);

            console.log(`📖 Navegado para página ${paginasLidas}`);
          } else {
            console.warn(`⚠️ Página ${paginasLidas} não encontrada no array de páginas`);
          }
        } else {
          console.log('📖 Nenhum progresso salvo, iniciando da página 1');
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar progresso:', error);
      // Não mostrar erro ao usuário, apenas começar do início
    }
  }, [materialId, pages]);

  useEffect(() => {
    loadText();
  }, [loadText]);

  // Carregar progresso salvo após páginas serem carregadas
  useEffect(() => {
    if (pages.length > 0 && !loading) {
      loadSavedProgress();
    }
  }, [pages.length, loading, loadSavedProgress]);

  // Iniciar cronômetro quando carregar o texto
  useEffect(() => {
    if (!loading && textData) {
      // Inicia o cronômetro
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      // Cleanup ao desmontar
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [loading, textData]);

  // Formatar tempo em HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }, []);

  // Salvar progresso no backend
  const markCurrentPageAsRead = useCallback(async () => {
    if (currentPageIndex < 0 || currentPageIndex >= pages.length) {
      Alert.alert('Erro', 'Nenhuma página válida para salvar');
      return;
    }

    const pageNumber = pages[currentPageIndex].pageNumber;
    const tempoLeitura = elapsedTime;

    try {
      console.log('💾 Salvando progresso...', {
        currentPageIndex,
        pageNumber,
        displayedPage: currentPageIndex + 1,
        materialId,
        paginaAtual: pageNumber,
        tempoLeituraSegundos: tempoLeitura,
      });

      const progressData = {
        paginaAtual: pageNumber,
        tempoLeituraSegundos: tempoLeitura,
        assuntosEstudados: null,
      };

      let planoAtualizado = false;
      let horasAdicionadas = 0;
      let disciplinas: string[] = [];

      try {
        // Tentar salvar online primeiro
        const response = await api.post(`/material/${materialId}/historico-leitura`, progressData);

        if (response.data.success) {
          console.log('✅ Progresso salvo online com sucesso');

          // Capturar informações sobre plano atualizado
          planoAtualizado = response.data.planoAtualizado || false;
          horasAdicionadas = response.data.horasAdicionadas || 0;
          disciplinas = response.data.disciplinasAtualizadas || [];
        }
      } catch (networkError) {
        // Se falhar (offline), adicionar à fila de sincronização
        console.log('📴 Offline detectado, adicionando à fila de sincronização');
        await syncQueueService.addToQueue('historico', materialId, progressData);
      }

      // Marcar localmente como lida (independente de estar online ou offline)
      setReadPages(prev => {
        const newSet = new Set(prev);
        newSet.add(pageNumber);
        return newSet;
      });

      // Resetar cronômetro
      setElapsedTime(0);

      // Mostrar mensagem de sucesso
      const minutos = Math.floor(tempoLeitura / 60);
      const segundos = tempoLeitura % 60;
      const tempoFormatado = `${minutos}min ${segundos}s`;

      // Mensagem diferente se plano foi atualizado
      if (planoAtualizado && horasAdicionadas > 0) {
        const horasTexto = horasAdicionadas.toFixed(2);
        const disciplinasTexto = disciplinas.join(', ');

        Alert.alert(
          'Progresso salvo! ✓',
          `Página ${pageNumber} - Tempo: ${tempoFormatado}\n\n✅ +${horasTexto}h adicionadas ao plano de hoje\n📚 ${disciplinasTexto}`,
          [{text: 'OK'}]
        );
      } else {
        Alert.alert(
          'Progresso salvo! ✓',
          `Página ${pageNumber} - Tempo: ${tempoFormatado}`,
          [{text: 'OK'}]
        );
      }

      console.log('✅ Progresso salvo localmente');
    } catch (error: any) {
      console.error('❌ Erro ao salvar progresso:', error);

      Alert.alert(
        'Erro ao salvar progresso',
        'Erro ao salvar localmente',
        [{text: 'OK'}]
      );
    }
  }, [currentPageIndex, pages, elapsedTime, materialId]);

  // Detectar página visível no scroll
  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      const firstVisibleIndex = viewableItems[0].index;
      setCurrentPageIndex(firstVisibleIndex);
    }
  }).current;

  // Dividir texto em sentenças para TTS
  const splitIntoSentences = useCallback((text: string): string[] => {
    // Remove markdown simples (títulos, listas, etc)
    const plainText = text
      .replace(/^#{1,6}\s+/gm, '') // Remove # de títulos
      .replace(/^\s*[-*]\s+/gm, '') // Remove marcadores de lista
      .replace(/^\s*\d+\.\s+/gm, '') // Remove números de lista
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove negrito
      .replace(/\*(.*?)\*/g, '$1') // Remove itálico
      .replace(/`(.*?)`/g, '$1'); // Remove code inline

    // Divide em sentenças (por ponto, exclamação, interrogação)
    const sentences = plainText
      .split(/([.!?]+\s+)/)
      .filter(s => s.trim().length > 0)
      .reduce((acc: string[], part, i, arr) => {
        if (i % 2 === 0) {
          const sentence = part + (arr[i + 1] || '');
          if (sentence.trim()) acc.push(sentence.trim());
        }
        return acc;
      }, []);

    return sentences;
  }, []);

  // Calcular tempo estimado por palavra baseado na velocidade de fala
  const getWordDuration = useCallback(() => {
    // Velocidade base: ~150 palavras/minuto em velocidade 1.0
    const baseWPM = 150;
    const adjustedWPM = baseWPM * speechRate; // Ajustar pela velocidade
    const msPerWord = (60 * 1000) / adjustedWPM;
    return msPerWord;
  }, [speechRate]);

  // Iniciar progresso palavra por palavra
  const startWordProgress = useCallback((sentence: string) => {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    const wordDuration = getWordDuration();

    console.log(`🎯 Iniciando progresso: ${words.length} palavras, ${wordDuration.toFixed(0)}ms cada`);

    setCurrentWordIndex(0);

    let wordIdx = 0;
    wordTimerRef.current = setInterval(() => {
      wordIdx++;
      if (wordIdx < words.length) {
        setCurrentWordIndex(wordIdx);
      } else {
        // Terminou as palavras, limpar timer
        if (wordTimerRef.current) {
          clearInterval(wordTimerRef.current);
          wordTimerRef.current = null;
        }
      }
    }, wordDuration);
  }, [getWordDuration]);

  // Parar progresso de palavras
  const stopWordProgress = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    setCurrentWordIndex(0);
  }, []);

  // Carregar vozes disponíveis e preferências salvas
  useEffect(() => {
    const loadVoicesAndPreferences = async () => {
      try {
        // Carregar velocidade salva
        const savedSpeed = await AsyncStorage.getItem('tts_speed');
        if (savedSpeed) {
          const speed = parseFloat(savedSpeed);
          console.log(`📖 Velocidade carregada: ${speed}x`);
          setSpeechRate(speed);
        }

        // Carregar vozes disponíveis
        const voices = await Tts.voices();
        console.log(`🎤 Total de vozes disponíveis: ${voices.length}`);

        // Filtrar apenas vozes em português (pt-BR ou pt)
        const portugueseVoices = voices.filter((voice: any) =>
          voice.language.startsWith('pt-BR') || voice.language.startsWith('pt')
        );

        console.log(`🇧🇷 Vozes em português: ${portugueseVoices.length}`);
        portugueseVoices.forEach((voice: any) => {
          console.log(`  - ${voice.name} (${voice.language}) [${voice.id}]`);
        });

        setAvailableVoices(portugueseVoices);

        // Carregar voz salva
        const savedVoiceId = await AsyncStorage.getItem('tts_voice');
        if (savedVoiceId) {
          console.log(`🎤 Voz salva carregada: ${savedVoiceId}`);
          setSelectedVoice(savedVoiceId);
          Tts.setDefaultVoice(savedVoiceId);
        } else if (portugueseVoices.length > 0) {
          // Se não há voz salva, usar a primeira voz em português
          const defaultVoice = portugueseVoices[0];
          console.log(`🎤 Usando voz padrão: ${defaultVoice.name}`);
          setSelectedVoice(defaultVoice.id);
          Tts.setDefaultVoice(defaultVoice.id);
        }
      } catch (error) {
        console.error('Erro ao carregar vozes e preferências:', error);
      }
    };

    loadVoicesAndPreferences();
  }, []);

  // Função para mudar velocidade
  const changeSpeechRate = useCallback(async (newRate: number) => {
    console.log(`⚡ Mudando velocidade para ${newRate}x`);

    // Salvar no AsyncStorage
    try {
      await AsyncStorage.setItem('tts_speed', newRate.toString());
    } catch (error) {
      console.error('Erro ao salvar velocidade:', error);
    }

    // Atualizar estado
    setSpeechRate(newRate);

    // Atualizar TTS
    Tts.setDefaultRate(newRate);

    // Se estiver falando, reiniciar progresso de palavras com novo timing
    if (isSpeaking && wordTimerRef.current) {
      stopWordProgress();
      const currentSentence = sentencesRef.current[currentSentenceIndex];
      if (currentSentence) {
        // Pequeno delay para garantir que o timer anterior foi limpo
        setTimeout(() => {
          startWordProgress(currentSentence);
        }, 50);
      }
    }

    setShowSpeedModal(false);
  }, [isSpeaking, currentSentenceIndex, stopWordProgress, startWordProgress]);

  // Função para mudar voz
  const changeVoice = useCallback(async (voiceId: string) => {
    console.log(`🎤 Mudando voz para: ${voiceId}`);

    // Salvar no AsyncStorage
    try {
      await AsyncStorage.setItem('tts_voice', voiceId);
    } catch (error) {
      console.error('Erro ao salvar voz:', error);
    }

    // Atualizar estado
    setSelectedVoice(voiceId);

    // Atualizar TTS
    Tts.setDefaultVoice(voiceId);

    // Se estiver falando, parar e reiniciar com nova voz
    if (isSpeaking) {
      await Tts.stop();
      setIsSpeaking(false);
      setCurrentSentenceIndex(0);
      stopWordProgress();

      Alert.alert(
        'Voz alterada',
        'A voz foi alterada. Clique no botão de play para ouvir com a nova voz.'
      );
    }
  }, [isSpeaking, stopWordProgress]);

  // Configurar TTS e monitorar estado do app
  useEffect(() => {
    Tts.setDefaultLanguage('pt-BR');
    Tts.setDefaultRate(speechRate);
    Tts.setDefaultPitch(1.0);

    // Listener para mudanças de estado do app (background/foreground)
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log(`📱 App state mudou para: ${nextAppState}`);
    });

    return () => {
      Tts.stop();
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
      }

      // Parar serviço de foreground ao desmontar componente
      if (TTSServiceModule) {
        TTSServiceModule.stopService();
        console.log('⏹ Serviço de foreground parado (desmontagem)');
      }

      subscription.remove();
    };
  }, [speechRate]);

  // Scroll automático suave para sentença atual
  useEffect(() => {
    if (isSpeaking && currentSentenceIndex >= 0 && scrollViewRef.current) {
      const sentenceView = sentenceViewRefs.current.get(currentSentenceIndex);

      if (sentenceView) {
        // Aguardar renderização
        setTimeout(() => {
          sentenceView.measureLayout(
            scrollViewRef.current as any,
            (x, y, width, height) => {
              // Posicionar sentença 20% do topo da tela (cerca de 150px)
              const scrollY = Math.max(0, y - 150);

              scrollViewRef.current?.scrollTo({
                y: scrollY,
                animated: true,
              });

              console.log(`📜 Scroll suave para sentença ${currentSentenceIndex} (y: ${scrollY})`);
            },
            () => {
              console.warn('⚠️ Erro ao medir sentença');
            }
          );
        }, 150);
      }
    }
  }, [isSpeaking, currentSentenceIndex]);

  // Listener para controles da notificação (play/pause/stop)
  useEffect(() => {
    console.log('📡 Registrando listeners para controles da notificação...');

    const playPauseListener = DeviceEventEmitter.addListener('TTS_PLAY_PAUSE', async (event) => {
      console.log('🎮 [EVENTO RECEBIDO] Play/Pause da notificação:', JSON.stringify(event));

      try {
        if (event.value) {
          // Play - retomar leitura
          console.log('▶️ Play solicitado. Estado atual - isSpeaking:', isSpeaking, 'currentSentenceIndex:', currentSentenceIndex);

          if (!isSpeaking && pages[currentPageIndex]) {
            const pageContent = pages[currentPageIndex].content;
            const sentences = splitIntoSentences(pageContent);

            console.log(`📖 Preparando retomar leitura: ${sentences.length} sentenças, índice atual: ${currentSentenceIndex}`);

            if (sentences.length > 0 && currentSentenceIndex < sentences.length) {
              sentencesRef.current = sentences;
              setIsSpeaking(true);

              const sentenceToSpeak = sentences[currentSentenceIndex];
              console.log(`🔊 Retomando: "${sentenceToSpeak.substring(0, 50)}..."`);

              await Tts.speak(sentenceToSpeak);

              // Atualizar estado do serviço para mostrar botão Pause
              if (TTSServiceModule) {
                TTSServiceModule.updatePlayingState(true);
                console.log('📢 Estado do serviço atualizado para Playing');
              }

              console.log('✅ Leitura retomada com sucesso');
            } else {
              console.warn('⚠️ Não há sentença válida para retomar');
            }
          } else {
            console.log('ℹ️ Já está falando ou página inválida');
          }
        } else {
          // Pause
          console.log('⏸ Pause solicitado');
          await Tts.stop();
          setIsSpeaking(false);

          // Atualizar estado do serviço para mostrar botão Play
          if (TTSServiceModule) {
            TTSServiceModule.updatePlayingState(false);
            console.log('📢 Estado do serviço atualizado para Paused');
          }

          console.log('✅ Pausado com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao processar Play/Pause:', error);
      }
    });

    const stopListener = DeviceEventEmitter.addListener('TTS_STOP', async () => {
      console.log('⏹ [EVENTO RECEBIDO] Stop da notificação');

      try {
        await Tts.stop();
        setIsSpeaking(false);
        setCurrentSentenceIndex(0);
        console.log('✅ Parado com sucesso');

        // Parar serviço de foreground
        if (TTSServiceModule) {
          TTSServiceModule.stopService();
          console.log('⏹ Serviço de foreground parado');
        }
      } catch (error) {
        console.error('❌ Erro ao processar Stop:', error);
      }
    });

    return () => {
      console.log('🔌 Removendo listeners de controles');
      playPauseListener.remove();
      stopListener.remove();
    };
  }, [isSpeaking, pages, currentPageIndex, currentSentenceIndex, splitIntoSentences]);

  // Listener para avançar sentenças
  useEffect(() => {
    const handleStart = () => {
      console.log('🔊 TTS iniciado');
      // Iniciar progresso de palavras quando o TTS começa a falar
      const currentSentence = sentencesRef.current[currentSentenceIndex];
      if (currentSentence) {
        startWordProgress(currentSentence);
      }
    };

    const handleFinish = () => {
      console.log('✅ TTS finalizado - sentença completada');

      // Parar progresso de palavras
      stopWordProgress();

      // Avançar para próxima sentença IMEDIATAMENTE (sem setTimeout)
      setCurrentSentenceIndex(prevIndex => {
        const nextIndex = prevIndex + 1;

        if (nextIndex < sentencesRef.current.length) {
          // Ainda há sentenças na página atual
          const sentence = sentencesRef.current[nextIndex];
          console.log(`📖 Próxima sentença ${nextIndex + 1}/${sentencesRef.current.length}: ${sentence.substring(0, 50)}...`);

          // CHAMADA DIRETA sem setTimeout para funcionar em background
          Tts.speak(sentence).catch(err => {
            console.error('Erro ao falar próxima sentença:', err);
          });

          return nextIndex;
        } else {
          // Terminou as sentenças da página atual
          console.log('✅ Página atual concluída');

          // Verificar se há próxima página
          setCurrentPageIndex(prevPageIndex => {
            const nextPageIndex = prevPageIndex + 1;

            if (nextPageIndex < pages.length) {
              console.log(`📄 Avançando para página ${nextPageIndex + 1}/${pages.length}`);

              // Preparar sentenças da próxima página
              const nextPageContent = pages[nextPageIndex].content;
              const nextPageSentences = splitIntoSentences(nextPageContent);
              sentencesRef.current = nextPageSentences;

              // Iniciar leitura da primeira sentença da nova página IMEDIATAMENTE
              if (nextPageSentences.length > 0) {
                console.log(`📖 Iniciando página ${nextPageIndex + 1}: ${nextPageSentences[0].substring(0, 50)}...`);

                // CHAMADA DIRETA sem setTimeout para funcionar em background
                Tts.speak(nextPageSentences[0]).catch(err => {
                  console.error('Erro ao falar primeira sentença da nova página:', err);
                });
              }

              return nextPageIndex;
            } else {
              // Terminou todas as páginas
              console.log('🎉 Leitura completa de todo o documento!');
              setIsSpeaking(false);

              // Parar serviço de foreground
              if (TTSServiceModule) {
                TTSServiceModule.stopService();
                console.log('⏹ Serviço de foreground parado (leitura completa)');
              }

              return prevPageIndex;
            }
          });

          return 0; // Resetar índice de sentença para a nova página
        }
      });
    };

    const handleCancel = () => {
      console.log('❌ TTS cancelado');
      stopWordProgress();
      setIsSpeaking(false);
      setCurrentSentenceIndex(0);

      // Parar serviço de foreground
      if (TTSServiceModule) {
        TTSServiceModule.stopService();
        console.log('⏹ Serviço de foreground parado (cancelado)');
      }
    };

    Tts.addEventListener('tts-start', handleStart);
    Tts.addEventListener('tts-finish', handleFinish);
    Tts.addEventListener('tts-cancel', handleCancel);

    return () => {
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    };
  }, [pages, splitIntoSentences, currentSentenceIndex, startWordProgress, stopWordProgress]);

  // Verificar permissão de bateria
  const checkAndRequestBatteryPermission = useCallback(async () => {
    if (!TTSServiceModule) return true;

    try {
      const isIgnoring = await TTSServiceModule.checkBatteryOptimization();

      if (!isIgnoring) {
        Alert.alert(
          'Permissão Necessária',
          'Para que o áudio continue funcionando com a tela bloqueada, precisamos desabilitar a otimização de bateria para este app.\n\nVocê será redirecionado para as configurações.',
          [
            {text: 'Cancelar', style: 'cancel'},
            {
              text: 'Permitir',
              onPress: () => {
                TTSServiceModule.requestBatteryOptimizationExemption();
              }
            }
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Erro ao verificar permissão de bateria:', error);
      return true; // Continuar mesmo se houver erro
    }
  }, []);

  // Iniciar/pausar leitura
  const toggleSpeech = useCallback(async () => {
    if (isSpeaking) {
      // Parar leitura
      await Tts.stop();
      setIsSpeaking(false);
      setCurrentSentenceIndex(0);

      // Parar serviço de foreground
      if (TTSServiceModule) {
        TTSServiceModule.stopService();
        console.log('⏹ Serviço de foreground parado');
      }

      console.log('⏹ Leitura pausada');
    } else {
      // Verificar permissão de bateria antes de iniciar
      const hasPermission = await checkAndRequestBatteryPermission();

      // Iniciar leitura da página atual
      if (!pages[currentPageIndex]) return;

      const pageContent = pages[currentPageIndex].content;
      const sentences = splitIntoSentences(pageContent);

      if (sentences.length === 0) {
        Alert.alert('Aviso', 'Não há texto para ler nesta página');
        return;
      }

      // Iniciar serviço de foreground para manter o TTS ativo em background
      if (TTSServiceModule) {
        TTSServiceModule.startService();
        console.log('🎯 Serviço de foreground iniciado');
        console.log(`📱 Permissão de bateria: ${hasPermission ? 'OK' : 'Aguardando'}`);
      }

      sentencesRef.current = sentences;
      setCurrentSentenceIndex(0);
      setIsSpeaking(true);

      console.log(`🔊 Iniciando leitura de ${sentences.length} sentenças`);
      Tts.speak(sentences[0]);
    }
  }, [isSpeaking, pages, currentPageIndex, splitIntoSentences, checkAndRequestBatteryPermission]);

  // Componente de sentença individual (memoizado para performance)
  const SentenceItem = React.memo<{
    sentence: string;
    index: number;
    isCurrentSentence: boolean;
  }>(({sentence, index, isCurrentSentence}) => {
    return (
      <View
        ref={ref => {
          if (ref) {
            sentenceViewRefs.current.set(index, ref);
          }
        }}
        style={[
          styles.sentenceContainer,
          isCurrentSentence && styles.currentSentenceContainer
        ]}>
        <Text
          style={[
            styles.sentenceText,
            isCurrentSentence && styles.currentSentenceText
          ]}>
          {sentence}
        </Text>
      </View>
    );
  });

  // Renderizar texto com highlight (sem FlatList aninhado)
  const renderTextWithHighlight = useCallback((content: string) => {
    if (!isSpeaking) {
      return <Markdown style={markdownStyles}>{content}</Markdown>;
    }

    const sentences = splitIntoSentences(content);

    return (
      <View>
        {sentences.map((sentence, index) => (
          <SentenceItem
            key={`sentence-${index}`}
            sentence={sentence}
            index={index}
            isCurrentSentence={index === currentSentenceIndex}
          />
        ))}
      </View>
    );
  }, [isSpeaking, currentSentenceIndex, splitIntoSentences]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Carregando texto...</Text>
      </SafeAreaView>
    );
  }

  if (!textData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Texto não disponível</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header - estilo Liquid Mode */}
      <View style={styles.header}>
        {/* Botão Voltar */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}>
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>

        {/* Cronômetro */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerIcon}>⏱</Text>
          <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        </View>

        {/* Espaçador flexível */}
        <View style={styles.headerSpacer} />

        {/* Botão de Configurações de Velocidade */}
        <TouchableOpacity
          onPress={() => setShowSpeedModal(true)}
          style={styles.settingsButton}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>

        {/* Botão TTS (Alto-falante) */}
        <TouchableOpacity
          onPress={toggleSpeech}
          style={[
            styles.ttsButton,
            isSpeaking && styles.ttsButtonActive
          ]}>
          <Text style={styles.ttsButtonText}>{isSpeaking ? '⏸' : '🔊'}</Text>
        </TouchableOpacity>

        {/* Botão de Progresso (Marcar como lido) */}
        <TouchableOpacity
          onPress={markCurrentPageAsRead}
          style={[
            styles.progressButton,
            readPages.has(pages[currentPageIndex]?.pageNumber) && styles.progressButtonActive
          ]}>
          <Text style={styles.progressButtonText}>✓</Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo com ScrollView (apenas página atual) */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}>
        <View style={styles.pageContainer}>
          {isSpeaking && pages[currentPageIndex]
            ? renderTextWithHighlight(pages[currentPageIndex].content)
            : pages[currentPageIndex]
              ? <Markdown style={markdownStyles}>{pages[currentPageIndex].content}</Markdown>
              : <Text style={styles.errorText}>Página não encontrada</Text>
          }
        </View>

        {/* Indicador de página */}
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            Página {currentPageIndex + 1} de {pages.length}
          </Text>
        </View>
      </ScrollView>

      {/* Controles de navegação entre páginas */}
      <View style={styles.pageControls}>
        <TouchableOpacity
          onPress={() => {
            if (currentPageIndex > 0) {
              setCurrentPageIndex(currentPageIndex - 1);
              scrollViewRef.current?.scrollTo({y: 0, animated: false});
            }
          }}
          disabled={currentPageIndex === 0}
          style={[
            styles.pageButton,
            currentPageIndex === 0 && styles.pageButtonDisabled
          ]}>
          <Text style={[
            styles.pageButtonText,
            currentPageIndex === 0 && styles.pageButtonTextDisabled
          ]}>← Anterior</Text>
        </TouchableOpacity>

        <View style={styles.pageInfo}>
          <Text style={styles.pageInfoText}>
            {currentPageIndex + 1} / {pages.length}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (currentPageIndex < pages.length - 1) {
              setCurrentPageIndex(currentPageIndex + 1);
              scrollViewRef.current?.scrollTo({y: 0, animated: false});
            }
          }}
          disabled={currentPageIndex === pages.length - 1}
          style={[
            styles.pageButton,
            currentPageIndex === pages.length - 1 && styles.pageButtonDisabled
          ]}>
          <Text style={[
            styles.pageButtonText,
            currentPageIndex === pages.length - 1 && styles.pageButtonTextDisabled
          ]}>Próxima →</Text>
        </TouchableOpacity>
      </View>

      {/* Status de processamento */}
      {textData.processingStatus !== 'completed' && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>
            ⚠️ Processamento: {textData.processedPages}/{textData.totalPages}{' '}
            páginas
          </Text>
        </View>
      )}

      {/* Modal de Configuração de Velocidade */}
      <Modal
        visible={showSpeedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSpeedModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpeedModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurações de Voz</Text>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Seção de Vozes */}
              {availableVoices.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Voz</Text>
                  <View style={styles.voiceOptionsContainer}>
                    {availableVoices.map(voice => (
                      <TouchableOpacity
                        key={voice.id}
                        style={[
                          styles.voiceOption,
                          selectedVoice === voice.id && styles.voiceOptionSelected,
                        ]}
                        onPress={() => changeVoice(voice.id)}>
                        <Text
                          style={[
                            styles.voiceOptionText,
                            selectedVoice === voice.id && styles.voiceOptionTextSelected,
                          ]}
                          numberOfLines={1}>
                          {voice.name}
                        </Text>
                        {selectedVoice === voice.id && (
                          <Text style={styles.voiceCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Seção de Velocidade */}
              <Text style={styles.sectionTitle}>Velocidade</Text>
              <Text style={styles.modalSubtitle}>
                Atual: {speechRate.toFixed(2)}x
              </Text>

              <View style={styles.speedOptionsContainer}>
                {speedOptions.map(speed => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedOption,
                      speechRate === speed && styles.speedOptionSelected,
                    ]}
                    onPress={() => changeSpeechRate(speed)}>
                    <Text
                      style={[
                        styles.speedOptionText,
                        speechRate === speed && styles.speedOptionTextSelected,
                      ]}>
                      {speed.toFixed(2)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSpeedModal(false)}>
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 32,
  },
  // Header estilo Liquid Mode
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  timerIcon: {
    fontSize: 16,
    color: '#fff',
  },
  timerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  headerSpacer: {
    flex: 1,
  },
  progressButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  progressButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  ttsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ttsButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  ttsButtonText: {
    fontSize: 20,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  // Estilos para sentenças (karaoke robusto)
  sentenceContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  currentSentenceContainer: {
    backgroundColor: '#dbeafe', // Azul claro
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6', // Azul médio
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sentenceText: {
    fontSize: 17,
    lineHeight: 28,
    color: '#1e293b',
  },
  currentSentenceText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#0f172a',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageContainer: {
    marginBottom: 20,
  },
  pageIndicator: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 20,
  },
  pageIndicatorText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  pageControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  pageButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    minWidth: 100,
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  pageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  pageButtonTextDisabled: {
    color: '#94a3b8',
  },
  pageInfo: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  pageInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  statusBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f59e0b',
  },
  statusText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Modal de Velocidade
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  speedOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  speedOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minWidth: 80,
    alignItems: 'center',
  },
  speedOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  speedOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  speedOptionTextSelected: {
    color: '#fff',
  },
  modalCloseButton: {
    backgroundColor: '#64748b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Opções de Voz
  voiceOptionsContainer: {
    marginBottom: 24,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  voiceOptionSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  voiceOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },
  voiceOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  voiceCheckmark: {
    fontSize: 18,
    color: '#3b82f6',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

// Estilos para o Markdown
const markdownStyles = {
  body: {
    color: '#1e293b',
    fontSize: 16,
    lineHeight: 28,
  },
  heading1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 16,
  },
  heading2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 20,
    marginBottom: 12,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 16,
  },
  strong: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  em: {
    fontStyle: 'italic',
  },
  bullet_list: {
    marginBottom: 16,
  },
  ordered_list: {
    marginBottom: 16,
  },
  list_item: {
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: '#f1f5f9',
    color: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  fence: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  blockquote: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    paddingLeft: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  hr: {
    backgroundColor: '#e2e8f0',
    height: 2,
    marginVertical: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  thead: {
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: 12,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  td: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
};
