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
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Disciplinas</Text>
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
        <View style={styles.list}>
          {disciplinas.map(disciplina => (
            <TouchableOpacity
              key={disciplina.id}
              style={styles.disciplinaCard}
              activeOpacity={0.7}
              onPress={() => {
                console.log('🔗 Navegando para disciplina:', disciplina.id, disciplina.nome);
                navigation.navigate('DisciplinaDetail', {
                  disciplinaId: disciplina.id,
                  disciplinaNome: disciplina.nome,
                  disciplinaCor: disciplina.cor,
                });
              }}>
              <View style={styles.disciplinaHeader}>
                <View
                  style={[
                    styles.disciplinaCor,
                    {backgroundColor: disciplina.cor || '#94a3b8'},
                  ]}
                />
                <View style={styles.disciplinaInfo}>
                  <Text style={styles.disciplinaNome}>{disciplina.nome}</Text>
                  {disciplina._count && (
                    <Text style={styles.materiaisCount}>
                      {disciplina._count.materiais}{' '}
                      {disciplina._count.materiais === 1
                        ? 'material'
                        : 'materiais'}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
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
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  disciplinaCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disciplinaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  disciplinaCor: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  disciplinaInfo: {
    flex: 1,
  },
  disciplinaNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  materiaisCount: {
    fontSize: 13,
    color: '#64748b',
  },
  arrow: {
    fontSize: 24,
    color: '#cbd5e1',
    marginLeft: 8,
  },
});
