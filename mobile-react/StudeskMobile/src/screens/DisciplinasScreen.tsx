import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import disciplinaService, {Disciplina} from '../services/disciplina.service';

type RootStackParamList = {
  DisciplinaDetail: {
    disciplinaId: string;
    disciplinaNome: string;
    disciplinaCor?: string;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DisciplinasScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  const loadDisciplinas = useCallback(async () => {
    try {
      const data = await disciplinaService.listar();
      setDisciplinas(data);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDisciplinas();
  }, [loadDisciplinas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDisciplinas();
  }, [loadDisciplinas]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
      </SafeAreaView>
    );
  }

  // Split into rows of 2
  const rows: Disciplina[][] = [];
  for (let i = 0; i < disciplinas.length; i += 2) {
    rows.push(disciplinas.slice(i, i + 2));
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
            tintColor="#e50914"
            colors={['#e50914']}
          />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Disciplinas</Text>
          <Text style={styles.subtitle}>
            {disciplinas.length}{' '}
            {disciplinas.length === 1 ? 'disciplina' : 'disciplinas'}
          </Text>
        </View>

        {disciplinas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nenhuma disciplina cadastrada ainda.
            </Text>
            <Text style={styles.emptySubtext}>
              Cadastre disciplinas no aplicativo web para vê-las aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {row.map(disciplina => (
                  <TouchableOpacity
                    key={disciplina.id}
                    style={styles.disciplinaCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      navigation.navigate('DisciplinaDetail', {
                        disciplinaId: disciplina.id,
                        disciplinaNome: disciplina.nome,
                        disciplinaCor: disciplina.cor,
                      });
                    }}>
                    <View
                      style={[
                        styles.disciplinaColorTop,
                        {backgroundColor: disciplina.cor || '#6b7280'},
                      ]}
                    />
                    <Text style={styles.disciplinaNome} numberOfLines={2}>
                      {disciplina.nome}
                    </Text>
                    {disciplina._count && (
                      <Text style={styles.materiaisCount}>
                        {disciplina._count.materiais}{' '}
                        {disciplina._count.materiais === 1
                          ? 'material'
                          : 'materiais'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                {/* Placeholder if odd number */}
                {row.length === 1 && <View style={styles.cardPlaceholder} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#1a1d24',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4a4d55',
    textAlign: 'center',
  },
  grid: {
    padding: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  disciplinaCard: {
    flex: 1,
    backgroundColor: '#1a1d24',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2d35',
    overflow: 'hidden',
  },
  cardPlaceholder: {
    flex: 1,
  },
  disciplinaColorTop: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  disciplinaNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 6,
  },
  materiaisCount: {
    fontSize: 12,
    color: '#6b7280',
  },
});
