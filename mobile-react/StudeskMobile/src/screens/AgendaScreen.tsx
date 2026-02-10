import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import dashboardService, {
  DisciplinaAgenda,
  AgendaMensal,
} from '../services/dashboard.service';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function AgendaScreen() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [agenda, setAgenda] = useState<AgendaMensal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await dashboardService.getAgenda(currentMonth, currentYear);
      setAgenda(data);
    } catch (error) {
      console.error('Erro ao carregar agenda:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, currentYear]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const navigateMonth = (direction: -1 | 1) => {
    setSelectedDay(null);
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const getDaysGrid = (): (number | null)[] => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  };

  const getDisciplinasForDay = (day: number): DisciplinaAgenda[] => {
    if (!agenda?.dias) return [];
    const key = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return agenda.dias[key] || [];
  };

  const getAllDisciplinas = (): DisciplinaAgenda[] => {
    if (!agenda?.dias) return [];
    const map = new Map<string, DisciplinaAgenda>();
    Object.values(agenda.dias).forEach(discs => {
      discs.forEach(d => {
        if (!map.has(d.disciplinaId)) {
          map.set(d.disciplinaId, d);
        }
      });
    });
    return Array.from(map.values());
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() + 1 &&
    currentYear === today.getFullYear();

  const grid = getDaysGrid();

  if (loading && !agenda) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MESES[currentMonth - 1]} {currentYear}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Centered calendar area */}
      <View style={styles.centerArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e50914"
              colors={['#e50914']}
            />
          }>
          {/* Calendar */}
          <View style={styles.calendarCard}>
            {/* Day headers */}
            <View style={styles.weekRow}>
              {DIAS_SEMANA.map(d => (
                <View key={d} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Day cells */}
            {(() => {
              const rows: (number | null)[][] = [];
              for (let i = 0; i < grid.length; i += 7) {
                rows.push(grid.slice(i, i + 7));
              }
              return rows.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.weekRow}>
                  {row.map((day, colIdx) => {
                    if (day === null) {
                      return <View key={`empty-${colIdx}`} style={styles.dayCell} />;
                    }
                    const discs = getDisciplinasForDay(day);
                    const hasDiscs = discs.length > 0;
                    const todayHighlight = isToday(day);
                    const isSelected = selectedDay === day;

                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayCell,
                          hasDiscs && styles.dayCellWithDiscs,
                          todayHighlight && styles.dayCellToday,
                          isSelected && styles.dayCellSelected,
                        ]}
                        onPress={() => setSelectedDay(isSelected ? null : day)}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.dayNumber,
                            todayHighlight && styles.dayNumberToday,
                          ]}>
                          {day}
                        </Text>
                        {hasDiscs && (
                          <View style={styles.dotsRow}>
                            {discs.slice(0, 4).map((disc, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.dot,
                                  {backgroundColor: disc.cor || '#6b7280'},
                                ]}
                              />
                            ))}
                            {discs.length > 4 && (
                              <Text style={styles.dotMore}>+{discs.length - 4}</Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {/* Pad last row */}
                  {row.length < 7 &&
                    Array.from({length: 7 - row.length}).map((_, i) => (
                      <View key={`pad-${i}`} style={styles.dayCell} />
                    ))}
                </View>
              ));
            })()}
          </View>

          {/* Selected day detail */}
          {selectedDay !== null && (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {selectedDay} de {MESES[currentMonth - 1]}
              </Text>
              {getDisciplinasForDay(selectedDay).length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma disciplina planejada</Text>
              ) : (
                getDisciplinasForDay(selectedDay).map((disc, idx) => (
                  <View key={idx} style={styles.discRow}>
                    <View
                      style={[
                        styles.discColorBar,
                        {backgroundColor: disc.cor || '#6b7280'},
                      ]}
                    />
                    <View style={styles.discInfo}>
                      <Text style={styles.discName}>{disc.nome}</Text>
                      <View style={styles.discMeta}>
                        <Text style={styles.discMetaText}>
                          {disc.horasRealizadas.toFixed(1)}/{disc.horasPlanejadas.toFixed(1)}h
                        </Text>
                        {disc.questoesPlanejadas > 0 && (
                          <Text style={styles.discMetaText}>
                            {disc.questoesRealizadas}/{disc.questoesPlanejadas} quest.
                          </Text>
                        )}
                      </View>
                    </View>
                    {disc.concluida && (
                      <Text style={styles.checkmark}>{'✓'}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Legend */}
          {getAllDisciplinas().length > 0 && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Disciplinas</Text>
              <View style={styles.legendGrid}>
                {getAllDisciplinas().map(disc => (
                  <View key={disc.disciplinaId} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {backgroundColor: disc.cor || '#6b7280'},
                      ]}
                    />
                    <Text style={styles.legendText} numberOfLines={1}>
                      {disc.nome}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{height: 32}} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#1a1d24',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e2028',
    borderWidth: 1,
    borderColor: '#2a2d35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#d1d5db',
    fontSize: 18,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  calendarCard: {
    backgroundColor: '#1a1d24',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayCell: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    margin: 1,
    borderRadius: 8,
  },
  dayCellWithDiscs: {
    backgroundColor: '#1e2028',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#e50914',
  },
  dayCellSelected: {
    backgroundColor: '#2a2d35',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d1d5db',
  },
  dayNumberToday: {
    color: '#e50914',
    fontWeight: 'bold',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotMore: {
    fontSize: 8,
    color: '#6b7280',
  },
  detailCard: {
    backgroundColor: '#1a1d24',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  discRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  discColorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  discInfo: {
    flex: 1,
  },
  discName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
  },
  discMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  discMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  checkmark: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  legendCard: {
    backgroundColor: '#1a1d24',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  legendTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#d1d5db',
    flex: 1,
  },
});
