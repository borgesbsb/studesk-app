import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../contexts/AuthContext';
import dashboardService, {
  DashboardStats,
  MateriaDoDia,
  MaterialAdmin,
  EvolucaoCiclo,
} from '../services/dashboard.service';
import {api} from '../services/api';

/** Formata horas decimais: <1h → "45min", >=1h → "1h 30min" */
const formatTempo = (horas: number): string => {
  const totalMin = Math.round(horas * 60);
  if (totalMin < 60) {
    return `${totalMin}min`;
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

/** Gauge semicircular (velocímetro) */
const GaugeChart = ({
  realized,
  planned,
  size = 150,
  strokeWidth = 10,
}: {
  realized: number;
  planned: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const percent = planned > 0 ? Math.min((realized / planned) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Arc from 180° (left) to 0° (right) = semicircle
  const describeArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Track: full semicircle (180° to 360°/0°)
  const trackPath = describeArc(180, 360);
  // Fill: partial arc based on percent
  const fillAngle = 180 + (percent / 100) * 180;
  const fillPath = percent > 0 ? describeArc(180, Math.min(fillAngle, 359.9)) : '';

  const fillColor =
    percent >= 100 ? '#10b981' : percent >= 60 ? '#e50914' : '#d97706';

  return (
    <View style={{alignItems: 'center'}}>
      <Svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        {/* Track */}
        <Path
          d={trackPath}
          stroke="#2a2d35"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Fill */}
        {percent > 0 && (
          <Path
            d={fillPath}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      {/* Center text */}
      <View style={{position: 'absolute', bottom: 0, alignItems: 'center'}}>
        <Text style={{fontSize: 28, fontWeight: 'bold', color: '#fff'}}>
          {formatTempo(realized)}
        </Text>
        <Text style={{fontSize: 11, color: '#6b7280'}}>
          de {formatTempo(planned)}
        </Text>
      </View>
    </View>
  );
};

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
    disciplinaId?: string;
    tempoAssistido?: number;
    duracao?: number;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TodayScreen() {
  const {user, token} = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [materiasDoDia, setMateriasDoDia] = useState<MateriaDoDia[]>([]);
  const [evolucao, setEvolucao] = useState<EvolucaoCiclo | null>(null);

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 Carregando dados do dashboard...');
      const [statsData, materiasData, evolucaoData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getMateriasDoDia(),
        dashboardService.getEvolucaoCiclo(),
      ]);
      setStats(statsData);
      setMateriasDoDia(materiasData);
      setEvolucao(evolucaoData);

      // Detectar mudanças comparando com snapshot anterior
      const prev = prevValuesRef.current;
      if (Object.keys(prev).length > 0) {
        for (const m of materiasData) {
          const p = prev[m.disciplinaId];
          if (!p) continue;
          if (m.horasRealizadas > p.horas) {
            setFlashDisciplinaId(m.disciplinaId);
            setTimeout(() => setFlashDisciplinaId(null), 2000);
          }
          if (m.questoesRealizadas > p.questoes) {
            setFlashQuestoesDisciplinaId(m.disciplinaId);
            setTimeout(() => setFlashQuestoesDisciplinaId(null), 2000);
          }
        }
      }

      // Atualizar snapshot
      const snap: Record<string, {horas: number; questoes: number}> = {};
      for (const m of materiasData) {
        snap[m.disciplinaId] = {horas: m.horasRealizadas, questoes: m.questoesRealizadas};
      }
      prevValuesRef.current = snap;
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // Modal de tempo
  const [tempoModalVisible, setTempoModalVisible] = useState(false);
  const [tempoMateria, setTempoMateria] = useState<MateriaDoDia | null>(null);
  const [tempoView, setTempoView] = useState<'menu' | 'addTempo'>('menu');
  const [tempoInput, setTempoInput] = useState('');
  const [submittingTempo, setSubmittingTempo] = useState(false);
  const [flashDisciplinaId, setFlashDisciplinaId] = useState<string | null>(null);
  const [flashQuestoesDisciplinaId, setFlashQuestoesDisciplinaId] = useState<string | null>(null);

  // Snapshot para detectar mudanças ao voltar de outra tela
  const prevValuesRef = useRef<Record<string, {horas: number; questoes: number}>>({});

  const handleOpenTempoModal = useCallback((materia: MateriaDoDia) => {
    setTempoMateria(materia);
    setTempoView('menu');
    setTempoInput('');
    setTempoModalVisible(true);
  }, []);

  const handleSubmitTempo = useCallback(async () => {
    if (!tempoMateria || !tempoInput) return;
    const minutos = parseInt(tempoInput, 10);
    if (isNaN(minutos) || minutos <= 0) {
      Alert.alert('Erro', 'Informe um número válido de minutos.');
      return;
    }
    setSubmittingTempo(true);
    try {
      const response = await api.post('/dashboard/adicionar-tempo', {
        disciplinaId: tempoMateria.disciplinaId,
        minutos,
      });
      console.log('✅ Tempo adicionado:', response.data);
      const discId = tempoMateria.disciplinaId;
      setTempoModalVisible(false);
      await dashboardService.clearCache();
      await loadData();
      setFlashDisciplinaId(discId);
      setTimeout(() => setFlashDisciplinaId(null), 2000);
    } catch (error: any) {
      console.error('Erro ao adicionar tempo:', error);
      Alert.alert('Erro', error?.response?.data?.error || 'Erro ao adicionar tempo.');
    } finally {
      setSubmittingTempo(false);
    }
  }, [tempoMateria, tempoInput, loadData]);

  // Modal de questões
  const [questoesModalVisible, setQuestoesModalVisible] = useState(false);
  const [questoesInput, setQuestoesInput] = useState('');
  const [questoesMateria, setQuestoesMateria] = useState<MateriaDoDia | null>(null);
  const [submittingQuestoes, setSubmittingQuestoes] = useState(false);

  const handleOpenQuestoesModal = useCallback((materia: MateriaDoDia) => {
    setQuestoesMateria(materia);
    setQuestoesInput('');
    setQuestoesModalVisible(true);
  }, []);

  const handleSubmitQuestoes = useCallback(async () => {
    if (!questoesMateria || !questoesInput) return;
    const quantidade = parseInt(questoesInput, 10);
    if (isNaN(quantidade) || quantidade <= 0) {
      Alert.alert('Erro', 'Informe um número válido de questões.');
      return;
    }
    setSubmittingQuestoes(true);
    try {
      const response = await api.post('/dashboard/adicionar-questoes', {
        disciplinaId: questoesMateria.disciplinaId,
        quantidade,
      });
      console.log('✅ Questões adicionadas:', response.data);
      const discId = questoesMateria.disciplinaId;
      setQuestoesModalVisible(false);
      await dashboardService.clearCache();
      await loadData();
      setFlashQuestoesDisciplinaId(discId);
      setTimeout(() => setFlashQuestoesDisciplinaId(null), 2000);
    } catch (error: any) {
      console.error('Erro ao adicionar questões:', error);
      Alert.alert('Erro', error?.response?.data?.error || 'Erro ao adicionar questões.');
    } finally {
      setSubmittingQuestoes(false);
    }
  }, [questoesMateria, questoesInput, loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6b7280"
            colors={['#e50914']}
          />
        }>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Olá, {user?.name || 'Estudante'}!
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>

        {/* Card de resumo com gauge */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tempo estudado hoje</Text>
          <GaugeChart
            realized={materiasDoDia.reduce((s, m) => s + m.horasRealizadas, 0)}
            planned={materiasDoDia.reduce((s, m) => s + m.minutosPlanejados / 60, 0)}
          />
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatBadge}>
              <Text style={styles.summaryStatValue}>
                {stats?.totalMateriais || 0}
              </Text>
              <Text style={styles.summaryStatLabel}>materiais</Text>
            </View>
            <View style={styles.summaryStatBadge}>
              <Text style={styles.summaryStatValue}>
                {stats?.totalDisciplinas || 0}
              </Text>
              <Text style={styles.summaryStatLabel}>disciplinas</Text>
            </View>
          </View>
        </View>

        {/* Evolução do Ciclo */}
        {evolucao && evolucao.dias.length > 0 && (
          <View style={styles.cicloCard}>
            <View style={styles.cicloHeader}>
              <Text style={styles.cicloTitle}>{evolucao.nomeCiclo}</Text>
              <Text style={styles.cicloPeriod}>
                {new Date(evolucao.dataInicio).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                {' - '}
                {new Date(evolucao.dataFim).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cicloBarsContainer}>
              {evolucao.dias.map((dia, index) => {
                const maxH = Math.max(
                  ...evolucao.dias.map(d => Math.max(d.minutosPlanejados, d.horasRealizadas)),
                  1,
                );
                const barMaxHeight = 60;
                const planejadaH = (dia.minutosPlanejados / maxH) * barMaxHeight;
                const realizadaH = (dia.horasRealizadas / maxH) * barMaxHeight;
                const isToday = new Date(dia.data).toDateString() === new Date().toDateString();
                return (
                  <View key={dia.dia} style={[styles.cicloBarGroup, isToday && styles.cicloBarGroupToday]}>
                    <View style={styles.cicloBarsRow}>
                      <View style={styles.cicloBarWrapper}>
                        <View
                          style={[
                            styles.cicloBar,
                            styles.cicloBarPlanejada,
                            {height: Math.max(planejadaH, 3)},
                          ]}
                        />
                      </View>
                      <View style={styles.cicloBarWrapper}>
                        <View
                          style={[
                            styles.cicloBar,
                            styles.cicloBarRealizada,
                            {height: Math.max(realizadaH, 3)},
                            dia.horasRealizadas >= dia.minutosPlanejados &&
                              dia.minutosPlanejados > 0 &&
                              styles.cicloBarConcluida,
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.cicloBarLabel, isToday && styles.cicloBarLabelToday]}>
                      {new Date(dia.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.cicloLegend}>
              <View style={styles.cicloLegendItem}>
                <View style={[styles.cicloLegendDot, {backgroundColor: '#ef4444'}]} />
                <Text style={styles.cicloLegendText}>Planejado</Text>
              </View>
              <View style={styles.cicloLegendItem}>
                <View style={[styles.cicloLegendDot, {backgroundColor: '#22c55e'}]} />
                <Text style={styles.cicloLegendText}>Realizado</Text>
              </View>
            </View>
          </View>
        )}

        {/* Estudos de Hoje */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Estudos de Hoje</Text>
        </View>

        {materiasDoDia.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhuma atividade programada para hoje.
            </Text>
          </View>
        ) : (
          materiasDoDia.map(materia => {
            const horasPlanejadas = materia.minutosPlanejados / 60;
            const horasPercent =
              horasPlanejadas > 0
                ? Math.min(
                    (materia.horasRealizadas / horasPlanejadas) * 100,
                    100,
                  )
                : 0;
            const questoesPercent =
              materia.questoesPlanejadas > 0
                ? Math.min(
                    (materia.questoesRealizadas / materia.questoesPlanejadas) *
                      100,
                    100,
                  )
                : 0;
            const corDisciplina = materia.disciplinaCor || '#3b82f6';

            return (
              <View key={materia.id} style={styles.materiaCard}>
                <View style={styles.materiaHeader}>
                  <View style={styles.materiaInfo}>
                    <View
                      style={[
                        styles.materiaCor,
                        {backgroundColor: corDisciplina},
                      ]}
                    />
                    <Text style={styles.materiaNome} numberOfLines={1}>
                      {materia.disciplinaNome}
                    </Text>
                  </View>
                  {materia.concluida && (
                    <Text style={styles.concluida}>✓</Text>
                  )}
                </View>

                <View style={styles.progressRow}>
                  <TouchableOpacity
                    style={styles.progressMiniCard}
                    activeOpacity={0.7}
                    onPress={() => handleOpenTempoModal(materia)}>
                    {(() => {
                      const isFlashing = flashDisciplinaId === materia.disciplinaId;
                      return (
                        <>
                          <View style={styles.progressMiniHeader}>
                            <Text style={styles.progressMiniIcon}>⏱</Text>
                            <Text style={[
                              styles.progressMiniLabel,
                              isFlashing && {color: '#10b981', fontWeight: '700'},
                            ]}>
                              {isFlashing ? '🎉🥳🎊' : 'Tempo'}
                            </Text>
                          </View>
                          <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarBg}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: `${horasPercent}%`,
                                    backgroundColor:
                                      isFlashing
                                        ? '#10b981'
                                        : horasPercent >= 100
                                          ? '#10b981'
                                          : corDisciplina,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                          <Text style={[
                            styles.progressMiniValue,
                            isFlashing && {color: '#10b981'},
                          ]}>
                            {formatTempo(materia.horasRealizadas)}/
                            {formatTempo(horasPlanejadas)}
                          </Text>
                        </>
                      );
                    })()}
                  </TouchableOpacity>

                  {materia.questoesPlanejadas > 0 && (
                    <TouchableOpacity
                      style={styles.progressMiniCard}
                      activeOpacity={0.7}
                      onPress={() => handleOpenQuestoesModal(materia)}>
                      {(() => {
                        const isQFlashing = flashQuestoesDisciplinaId === materia.disciplinaId;
                        return (
                          <>
                            <View style={styles.progressMiniHeader}>
                              <Text style={styles.progressMiniIcon}>📝</Text>
                              <Text style={[
                                styles.progressMiniLabel,
                                isQFlashing && {color: '#10b981', fontWeight: '700'},
                              ]}>
                                {isQFlashing ? '🎉🥳🎊' : 'Questões'}
                              </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                              <View style={styles.progressBarBg}>
                                <View
                                  style={[
                                    styles.progressBarFill,
                                    {
                                      width: `${questoesPercent}%`,
                                      backgroundColor:
                                        isQFlashing
                                          ? '#10b981'
                                          : questoesPercent >= 100
                                            ? '#10b981'
                                            : corDisciplina,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                            <Text style={[
                              styles.progressMiniValue,
                              isQFlashing && {color: '#10b981'},
                            ]}>
                              {materia.questoesRealizadas}/
                              {materia.questoesPlanejadas}
                            </Text>
                          </>
                        );
                      })()}
                    </TouchableOpacity>
                  )}
                </View>

                {materia.observacoes && (
                  <Text style={styles.observacoes}>{materia.observacoes}</Text>
                )}

                {materia.materiaisAdmin && materia.materiaisAdmin.length > 0 && (
                  <View style={styles.materiaisSection}>
                    {materia.materiaisAdmin.map((mat: MaterialAdmin) => {
                      const isPdf = mat.tipo === 'PDF';
                      const progressPercent = isPdf
                        ? mat.totalPaginas > 0
                          ? Math.min((mat.paginasLidas / mat.totalPaginas) * 100, 100)
                          : 0
                        : mat.duracaoSegundos && mat.duracaoSegundos > 0
                          ? Math.min(((mat.tempoAssistido || 0) / mat.duracaoSegundos) * 100, 100)
                          : 0;
                      const progressLabel = isPdf
                        ? `${mat.paginasLidas}/${mat.totalPaginas} pág.`
                        : mat.duracaoSegundos
                          ? `${Math.floor((mat.tempoAssistido || 0) / 60)}/${Math.floor(mat.duracaoSegundos / 60)} min`
                          : '';

                      return (
                        <TouchableOpacity
                          key={mat.id}
                          style={styles.materialItem}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (isPdf) {
                              navigation.navigate('MaterialReader', {
                                materialId: mat.id,
                                materialNome: mat.nome,
                                disciplinaCor: corDisciplina,
                              });
                            } else {
                              navigation.navigate('VideoPlayer', {
                                materialId: mat.id,
                                materialNome: mat.nome,
                                disciplinaId: materia.disciplinaId,
                                tempoAssistido: mat.tempoAssistido || 0,
                                duracao: mat.duracaoSegundos || undefined,
                              });
                            }
                          }}>
                          <View style={styles.materialItemLeft}>
                            <Text style={styles.materialItemIcon}>
                              {isPdf ? '📄' : '🎬'}
                            </Text>
                            <View style={styles.materialItemInfo}>
                              <Text style={styles.materialItemNome} numberOfLines={1}>
                                {mat.nome}
                              </Text>
                              <View style={styles.materialProgressRow}>
                                <View style={styles.materialProgressBg}>
                                  <View
                                    style={[
                                      styles.materialProgressFill,
                                      {
                                        width: `${progressPercent}%`,
                                        backgroundColor:
                                          progressPercent >= 100
                                            ? '#10b981'
                                            : corDisciplina,
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.materialProgressLabel}>
                                  {progressLabel}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Text style={styles.materialArrow}>›</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Disciplinas do Ciclo */}
        {evolucao && evolucao.disciplinas && evolucao.disciplinas.length > 0 && (
          <View style={styles.cicloCard}>
            <Text style={styles.cicloTitle}>Disciplinas - {evolucao.nomeCiclo}</Text>
            <View style={styles.discGrid}>
              {evolucao.disciplinas.map(disc => {
                const cor = disc.cor || '#3b82f6';
                return (
                  <TouchableOpacity
                    key={disc.id}
                    style={[styles.discBtn, {borderLeftColor: cor}]}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('DisciplinaDetail', {
                        disciplinaId: disc.id,
                        disciplinaNome: disc.nome,
                        disciplinaCor: cor,
                      })
                    }>
                    <Text style={styles.discNome} numberOfLines={2}>{disc.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Evolução de Questões do Ciclo */}
        {evolucao && evolucao.dias.some(d => d.questoesPlanejadas > 0 || d.questoesRealizadas > 0) && (
          <View style={styles.cicloCard}>
            <View style={styles.cicloHeader}>
              <Text style={styles.cicloTitle}>Questões - {evolucao.nomeCiclo}</Text>
              <Text style={styles.cicloPeriod}>
                {new Date(evolucao.dataInicio).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                {' - '}
                {new Date(evolucao.dataFim).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cicloBarsContainer}>
              {evolucao.dias.map((dia) => {
                const maxQ = Math.max(
                  ...evolucao.dias.map(d => Math.max(d.questoesPlanejadas, d.questoesRealizadas)),
                  1,
                );
                const barMaxHeight = 60;
                const planejadaH = (dia.questoesPlanejadas / maxQ) * barMaxHeight;
                const realizadaH = (dia.questoesRealizadas / maxQ) * barMaxHeight;
                const isToday = new Date(dia.data).toDateString() === new Date().toDateString();
                return (
                  <View key={dia.dia} style={[styles.cicloBarGroup, isToday && styles.cicloBarGroupToday]}>
                    <View style={styles.cicloBarsRow}>
                      <View style={styles.cicloBarWrapper}>
                        <View
                          style={[
                            styles.cicloBar,
                            styles.cicloBarPlanejada,
                            {height: Math.max(planejadaH, 3)},
                          ]}
                        />
                      </View>
                      <View style={styles.cicloBarWrapper}>
                        <View
                          style={[
                            styles.cicloBar,
                            styles.cicloBarRealizada,
                            {height: Math.max(realizadaH, 3)},
                            dia.questoesRealizadas >= dia.questoesPlanejadas &&
                              dia.questoesPlanejadas > 0 &&
                              styles.cicloBarConcluida,
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.cicloBarLabel, isToday && styles.cicloBarLabelToday]}>
                      {new Date(dia.data).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.cicloLegend}>
              <View style={styles.cicloLegendItem}>
                <View style={[styles.cicloLegendDot, {backgroundColor: '#ef4444'}]} />
                <Text style={styles.cicloLegendText}>Planejado</Text>
              </View>
              <View style={styles.cicloLegendItem}>
                <View style={[styles.cicloLegendDot, {backgroundColor: '#22c55e'}]} />
                <Text style={styles.cicloLegendText}>Realizado</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Modal de Tempo */}
      <Modal
        visible={tempoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTempoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.tempoModalContent}>
            {tempoMateria && (
              <>
                <Text style={styles.modalTitle}>{tempoMateria.disciplinaNome}</Text>
                <Text style={styles.tempoModalSub}>
                  {formatTempo(tempoMateria.horasRealizadas)} / {formatTempo(tempoMateria.minutosPlanejados / 60)}
                </Text>
              </>
            )}

            {tempoView === 'menu' ? (
              <>
                <View style={styles.tempoOptions}>
                  <TouchableOpacity
                    style={styles.tempoOptionBtn}
                    activeOpacity={0.7}
                    onPress={() => setTempoView('addTempo')}>
                    <Text style={styles.tempoOptionIcon}>⏱</Text>
                    <Text style={styles.tempoOptionLabel}>Add Tempo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tempoOptionBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      setTempoModalVisible(false);
                      // TODO: implementar cronômetro
                    }}>
                    <Text style={styles.tempoOptionIcon}>⏲</Text>
                    <Text style={styles.tempoOptionLabel}>Cronômetro</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tempoOptionBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      setTempoModalVisible(false);
                      if (tempoMateria) {
                        navigation.navigate('DisciplinaDetail', {
                          disciplinaId: tempoMateria.disciplinaId,
                          disciplinaNome: tempoMateria.disciplinaNome,
                          disciplinaCor: tempoMateria.disciplinaCor,
                        });
                      }
                    }}>
                    <Text style={styles.tempoOptionIcon}>📚</Text>
                    <Text style={styles.tempoOptionLabel}>Estudar Agora</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.tempoCloseBtn}
                  onPress={() => setTempoModalVisible(false)}>
                  <Text style={styles.tempoCloseBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>
                  Quantos minutos estudou?
                </Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Ex: 30"
                  placeholderTextColor="#6b7280"
                  value={tempoInput}
                  onChangeText={setTempoInput}
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalBtnCancel}
                    onPress={() => setTempoView('menu')}>
                    <Text style={styles.modalBtnCancelText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalBtnConfirm,
                      submittingTempo && styles.modalBtnDisabled,
                    ]}
                    onPress={handleSubmitTempo}
                    disabled={submittingTempo}>
                    <Text style={styles.modalBtnConfirmText}>
                      {submittingTempo ? 'Salvando...' : 'Adicionar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Questões */}
      <Modal
        visible={questoesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuestoesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Questões</Text>
            {questoesMateria && (
              <Text style={styles.modalSubtitle}>
                {questoesMateria.disciplinaNome}
              </Text>
            )}
            <Text style={styles.modalLabel}>
              Quantas questões você resolveu?
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder="Ex: 10"
              placeholderTextColor="#6b7280"
              value={questoesInput}
              onChangeText={setQuestoesInput}
              autoFocus
            />
            {questoesMateria && (
              <Text style={styles.modalProgress}>
                Progresso atual: {questoesMateria.questoesRealizadas}/
                {questoesMateria.questoesPlanejadas}
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setQuestoesModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnConfirm,
                  submittingQuestoes && styles.modalBtnDisabled,
                ]}
                onPress={handleSubmitQuestoes}
                disabled={submittingQuestoes}>
                <Text style={styles.modalBtnConfirmText}>
                  {submittingQuestoes ? 'Salvando...' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1115',
  },

  // ========== Header ==========
  header: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1d24',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'capitalize',
  },

  // ========== Card Resumo (Nubank style) ==========
  summaryCard: {
    backgroundColor: '#1e2028',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    marginTop: 12,
  },
  summaryStatBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1d24',
    borderWidth: 1,
    borderColor: '#2a2d35',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },

  // ========== Evolução do Ciclo ==========
  cicloCard: {
    backgroundColor: '#1e2028',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
  },
  cicloHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cicloTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
  },
  cicloPeriod: {
    fontSize: 11,
    color: '#6b7280',
  },
  cicloBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 4,
  },
  cicloBarGroup: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cicloBarGroupToday: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  cicloBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 4,
  },
  cicloBarWrapper: {
    width: 10,
    justifyContent: 'flex-end',
  },
  cicloBar: {
    width: 10,
    borderRadius: 3,
    minHeight: 3,
  },
  cicloBarPlanejada: {
    backgroundColor: '#ef4444',
    opacity: 0.5,
  },
  cicloBarRealizada: {
    backgroundColor: '#22c55e',
  },
  cicloBarConcluida: {
    backgroundColor: '#10b981',
  },
  cicloBarLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  cicloBarLabelToday: {
    color: '#e50914',
    fontWeight: '700',
  },
  cicloLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  cicloLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cicloLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cicloLegendText: {
    fontSize: 10,
    color: '#6b7280',
  },

  // ========== Disciplinas do Ciclo ==========
  discGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  discBtn: {
    width: '48%',
    backgroundColor: '#1a1d24',
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  discNome: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
  },

  // ========== Seções ==========
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // ========== Card Matéria do Dia ==========
  materiaCard: {
    backgroundColor: '#1a1d24',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
  },
  materiaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  materiaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  materiaCor: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  materiaNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d1d5db',
    flex: 1,
  },
  concluida: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: 'bold',
  },

  // ========== Mini Cards de Progresso ==========
  progressRow: {
    flexDirection: 'row',
    gap: 10,
  },
  progressMiniCard: {
    flex: 1,
    backgroundColor: '#1e2028',
    borderRadius: 10,
    padding: 12,
  },
  progressMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressMiniIcon: {
    fontSize: 14,
  },
  progressMiniLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressBarContainer: {
    marginBottom: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#2a2d35',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressMiniValue: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  observacoes: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
    paddingLeft: 14,
  },

  // ========== Materiais do Dia ==========
  materiaisSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2d35',
    paddingTop: 10,
    gap: 8,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e2028',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  materialItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  materialItemIcon: {
    fontSize: 16,
  },
  materialItemInfo: {
    flex: 1,
    gap: 4,
  },
  materialItemNome: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
  },
  materialProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  materialProgressBg: {
    flex: 1,
    height: 3,
    backgroundColor: '#2a2d35',
    borderRadius: 2,
    overflow: 'hidden',
  },
  materialProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  materialProgressLabel: {
    fontSize: 10,
    color: '#6b7280',
    minWidth: 60,
    textAlign: 'right',
  },
  materialArrow: {
    fontSize: 18,
    color: '#4b5563',
    marginLeft: 6,
  },


  // ========== Modal Questões ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  // ========== Modal de Tempo ==========
  tempoModalContent: {
    backgroundColor: '#1a1d24',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  tempoModalSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 20,
  },
  tempoOptions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  tempoOptionBtn: {
    flex: 1,
    backgroundColor: '#1e2028',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2d35',
  },
  tempoOptionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  tempoOptionLabel: {
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '600',
    textAlign: 'center',
  },
  tempoCloseBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  tempoCloseBtnText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },

  modalContent: {
    backgroundColor: '#1a1d24',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#1e2028',
    borderWidth: 1,
    borderColor: '#2a2d35',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalProgress: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#1e2028',
    borderWidth: 1,
    borderColor: '#2a2d35',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: '#e50914',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalBtnConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ========== Estado Vazio ==========
  emptyCard: {
    backgroundColor: '#1a1d24',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8a8d95',
    textAlign: 'center',
  },
});
