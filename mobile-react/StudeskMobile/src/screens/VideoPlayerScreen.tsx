import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  Alert,
  StatusBar,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import Video, {
  OnProgressData,
  OnLoadData,
  OnPlaybackStateChangedData,
} from 'react-native-video';
import videoService from '../services/video.service';

type RootStackParamList = {
  VideoPlayer: {
    materialId: string;
    materialNome: string;
    tempoAssistido?: number;
    duracao?: number;
  };
};

type VideoPlayerRouteProp = RouteProp<RootStackParamList, 'VideoPlayer'>;

export default function VideoPlayerScreen() {
  const route = useRoute<VideoPlayerRouteProp>();
  const navigation = useNavigation();
  const {materialId, materialNome, tempoAssistido = 0, duracao = 0} = route.params;

  const videoRef = useRef<any>(null);

  // Video state
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duracao);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [seeked, setSeeked] = useState(false);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // Progress bar width for seek
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  // Refs for cleanup
  const currentTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);
  const savedRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Video path
  const videoPath = videoService.getVideoPath(materialId);

  // Sync refs
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    elapsedTimeRef.current = elapsedTime;
  }, [elapsedTime]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Timer acompanha o vídeo mesmo em background (usuário pode ouvir áudio com tela bloqueada)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        setShowControls(true);
      }
    });
    return () => subscription.remove();
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (!paused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 4000);
    }
  }, [paused]);


  // Video callbacks
  const onLoad = (data: OnLoadData) => {
    const realDuration = data.duration;
    setVideoDuration(realDuration);
    setLoading(false);

    // Atualizar duração no servidor se diferir da estimativa
    if (realDuration > 0 && Math.abs(realDuration - duracao) > 5) {
      console.log(`📐 Duração real: ${Math.floor(realDuration)}s (banco: ${duracao}s) - atualizando...`);
      videoService.atualizarDuracao(materialId, realDuration);
    }

    if (tempoAssistido > 0 && !seeked) {
      videoRef.current?.seek(tempoAssistido);
      setSeeked(true);
    }
  };

  const onProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const onBuffer = ({isBuffering}: {isBuffering: boolean}) => {
    setLoading(isBuffering);
  };

  // Sync React state with notification/lock screen controls
  const onPlaybackStateChanged = (data: OnPlaybackStateChangedData) => {
    if (data.isPlaying && paused) {
      setPaused(false);
      setIsTimerRunning(true);
      resetControlsTimeout();
    } else if (!data.isPlaying && !paused && !loading) {
      setPaused(true);
      setIsTimerRunning(false);
      // Manter controles visíveis quando pausado
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      setShowControls(true);
    }
  };

  const togglePlay = () => {
    const newPaused = !paused;
    setPaused(newPaused);
    setIsTimerRunning(!newPaused);
    if (newPaused) {
      // Pausou: manter controles visíveis e cancelar auto-hide
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
      setShowControls(true);
    } else {
      resetControlsTimeout();
    }
  };

  const handleSeek = (position: number) => {
    videoRef.current?.seek(position);
    setCurrentTime(position);
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 10, videoDuration);
    handleSeek(newTime);
    resetControlsTimeout();
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 10, 0);
    handleSeek(newTime);
    resetControlsTimeout();
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    resetControlsTimeout();
  };

  const handleGoBack = () => {
    setPaused(true);
    setIsTimerRunning(false);
    navigation.goBack();
  };

  const handleSaveProgress = async () => {
    if (savingProgress) return;

    // Pausar vídeo e cancelar auto-hide dos controles
    setPaused(true);
    setIsTimerRunning(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setSavingProgress(true);
    savedRef.current = true;

    try {
      await videoService.salvarProgresso(materialId, currentTime);

      if (elapsedTime > 0) {
        await videoService.registrarHistorico(
          materialId,
          Math.floor(currentTime),
          elapsedTime,
        );
      }

      setElapsedTime(0);
      savedRef.current = false;

      Alert.alert('Sucesso', 'Progresso salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      Alert.alert('Erro', 'Erro ao salvar progresso. Tente novamente.');
      savedRef.current = false;
    } finally {
      setSavingProgress(false);
      setShowControls(true);
    }
  };

  const handleScreenTap = () => {
    if (showSpeedMenu) {
      setShowSpeedMenu(false);
      return;
    }
    resetControlsTimeout();
  };

  // Seek via progress bar touch
  const handleProgressBarSeek = (locationX: number) => {
    if (progressBarWidth > 0 && videoDuration > 0) {
      const percent = Math.max(0, Math.min(1, locationX / progressBarWidth));
      const seekTo = percent * videoDuration;
      handleSeek(seekTo);
      resetControlsTimeout();
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatElapsedTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const progressPercent =
    videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.videoContainer}
        onPress={handleScreenTap}>
        <Video
          ref={videoRef}
          source={{
            uri: `file://${videoPath}`,
            metadata: {
              title: materialNome,
              artist: 'Studesk',
            },
          }}
          style={styles.video}
          paused={paused}
          rate={playbackRate}
          resizeMode="contain"
          playInBackground={true}
          playWhenInactive={true}
          showNotificationControls={true}
          onLoad={onLoad}
          onProgress={onProgress}
          onBuffer={onBuffer}
          onPlaybackStateChanged={onPlaybackStateChanged}
          onEnd={() => {
            setPaused(true);
            setIsTimerRunning(false);
            if (controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current);
              controlsTimeoutRef.current = null;
            }
            setShowControls(true);
          }}
          progressUpdateInterval={500}
        />

        {/* Loading */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Center play/pause controls (YouTube style) */}
        {showControls && !loading && (
          <View style={styles.centerControls} pointerEvents="box-none">
            <TouchableOpacity onPress={skipBackward} style={styles.centerCtrlBtn}>
              <Text style={styles.centerCtrlIcon}>10</Text>
              <Text style={styles.centerCtrlArrow}>↺</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlay} style={styles.centerPlayBtn}>
              <Text style={styles.centerPlayIcon}>
                {paused ? '▶' : '⏸'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={skipForward} style={styles.centerCtrlBtn}>
              <Text style={styles.centerCtrlIcon}>10</Text>
              <Text style={styles.centerCtrlArrow}>↻</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Controls overlay */}
        {showControls && (
          <View style={styles.controlsOverlay} pointerEvents="box-none">
            {/* Top gradient + header */}
            <View style={styles.topGradient}>
              <SafeAreaView edges={['top']} style={styles.headerBar}>
                <TouchableOpacity
                  onPress={handleGoBack}
                  style={styles.backBtn}>
                  <Text style={styles.backBtnText}>{'←'}</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {materialNome}
                  </Text>
                </View>
                <View style={styles.timerBadge}>
                  <Text style={styles.timerIcon}>⏱</Text>
                  <Text style={styles.timerText}>
                    {formatElapsedTime(elapsedTime)}
                  </Text>
                </View>
              </SafeAreaView>
            </View>

            {/* Bottom gradient + controls */}
            <View style={styles.bottomGradient}>
              <SafeAreaView edges={['bottom']} style={styles.bottomControls}>
                {/* Progress bar with seek */}
                <View
                  style={styles.progressBarContainer}
                  onLayout={(e: LayoutChangeEvent) => {
                    setProgressBarWidth(e.nativeEvent.layout.width);
                  }}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    handleProgressBarSeek(e.nativeEvent.locationX);
                  }}
                  onResponderMove={(e) => {
                    handleProgressBarSeek(e.nativeEvent.locationX);
                  }}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {width: `${progressPercent}%`},
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.progressBarThumb,
                      {left: `${progressPercent}%`},
                    ]}
                  />
                </View>

                {/* Time + controls row */}
                <View style={styles.bottomRow}>
                  {/* Time */}
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                      {formatTime(currentTime)}
                    </Text>
                    <Text style={styles.timeSeparator}> / </Text>
                    <Text style={styles.timeTextDuration}>
                      {formatTime(videoDuration)}
                    </Text>
                  </View>

                  {/* Right side: speed + save */}
                  <View style={styles.rightControls}>
                    <View>
                      <TouchableOpacity
                        onPress={() => setShowSpeedMenu(!showSpeedMenu)}
                        style={styles.speedBtn}>
                        <Text style={styles.speedBtnText}>{playbackRate}x</Text>
                      </TouchableOpacity>

                      {showSpeedMenu && (
                        <View style={styles.speedMenu}>
                          {speedOptions.map(speed => (
                            <TouchableOpacity
                              key={speed}
                              onPress={() => handleSpeedChange(speed)}
                              style={[
                                styles.speedMenuItem,
                                playbackRate === speed && styles.speedMenuItemActive,
                              ]}>
                              <Text
                                style={[
                                  styles.speedMenuItemText,
                                  playbackRate === speed &&
                                    styles.speedMenuItemTextActive,
                                ]}>
                                {speed === 1 ? 'Normal' : `${speed}x`}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={handleSaveProgress}
                      disabled={savingProgress}
                      style={[
                        styles.saveBtn,
                        savingProgress && styles.saveBtnDisabled,
                      ]}>
                      {savingProgress ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.saveBtnIcon}>💾</Text>
                          <Text style={styles.saveBtnText}>Salvar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Center controls (YouTube-style)
  centerControls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  centerCtrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCtrlIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  centerCtrlArrow: {
    fontSize: 18,
    color: '#fff',
    marginTop: -4,
  },
  centerPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayIcon: {
    fontSize: 32,
    color: '#fff',
    marginLeft: 2,
  },

  // Controls overlay
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },

  // Top gradient
  topGradient: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '300',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  timerIcon: {
    fontSize: 12,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },

  // Bottom gradient
  bottomGradient: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Progress bar
  progressBarContainer: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff0000',
    borderRadius: 1.5,
  },
  progressBarThumb: {
    position: 'absolute',
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    marginLeft: -6,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  timeTextDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontVariant: ['tabular-nums'],
  },

  // Right controls
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  speedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  speedMenu: {
    position: 'absolute',
    bottom: 36,
    right: 0,
    backgroundColor: 'rgba(28,28,28,0.95)',
    borderRadius: 8,
    padding: 4,
    minWidth: 110,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  speedMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
  },
  speedMenuItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speedMenuItemText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  speedMenuItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#cc0000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnIcon: {
    fontSize: 12,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
