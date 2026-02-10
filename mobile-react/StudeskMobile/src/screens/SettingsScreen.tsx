import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  getCurrentApiUrl,
  updateApiUrl,
  resetApiUrl,
  testApiConnection,
} from '../services/api';
import {COMMON_URLS, ENVIRONMENTS} from '../config/environment';

interface SettingsScreenProps {
  onClose?: () => void;
}

export default function SettingsScreen({onClose}: SettingsScreenProps) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentUrl();
  }, []);

  async function loadCurrentUrl() {
    const url = getCurrentApiUrl();
    setCurrentUrl(url);
    setCustomUrl(url);
  }

  async function handleTestConnection() {
    if (!customUrl.trim()) {
      Alert.alert('Erro', 'Por favor, digite uma URL');
      return;
    }

    setTesting(true);
    try {
      const isConnected = await testApiConnection(customUrl);
      if (isConnected) {
        Alert.alert('Sucesso', 'Conexão estabelecida com sucesso!');
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível conectar ao servidor.\n\nVerifique:\n- A URL está correta\n- O servidor está rodando\n- Para celular físico, use o IP da sua rede local'
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveUrl() {
    if (!customUrl.trim()) {
      Alert.alert('Erro', 'Por favor, digite uma URL');
      return;
    }

    setSaving(true);
    try {
      await updateApiUrl(customUrl);
      setCurrentUrl(customUrl);
      Alert.alert('Sucesso', 'URL salva com sucesso!', [
        {
          text: 'OK',
          onPress: onClose,
        },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar URL');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    Alert.alert(
      'Resetar URL',
      'Deseja resetar para a URL padrão?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetApiUrl();
              await loadCurrentUrl();
              Alert.alert('Sucesso', 'URL resetada para o padrão');
            } catch (error) {
              Alert.alert('Erro', 'Erro ao resetar URL');
            }
          },
        },
      ]
    );
  }

  function handleQuickSelect(url: string) {
    setCustomUrl(url);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Configurações da API</Text>
        <Text style={styles.subtitle}>
          Configure o servidor que o app deve conectar
        </Text>

        {/* URL Atual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>URL Atual</Text>
          <View style={styles.currentUrlBox}>
            <Text style={styles.currentUrlText} numberOfLines={2}>
              {currentUrl}
            </Text>
          </View>
        </View>

        {/* URLs Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>URLs Rápidas</Text>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect('http://localhost:3030/api')}>
            <View>
              <Text style={styles.quickButtonTitle}>
                Localhost (ADB Reverse)
              </Text>
              <Text style={styles.quickButtonUrl}>
                http://localhost:3030/api
              </Text>
              <Text style={styles.quickButtonDesc}>
                Requer: adb reverse tcp:3030 tcp:3030
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(COMMON_URLS.localNetwork)}>
            <View>
              <Text style={styles.quickButtonTitle}>
                Rede Local (WiFi)
              </Text>
              <Text style={styles.quickButtonUrl}>
                {COMMON_URLS.localNetwork}
              </Text>
              <Text style={styles.quickButtonDesc}>
                Celular e PC na mesma rede WiFi
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(COMMON_URLS.androidEmulator)}>
            <View>
              <Text style={styles.quickButtonTitle}>
                Emulador Android
              </Text>
              <Text style={styles.quickButtonUrl}>
                {COMMON_URLS.androidEmulator}
              </Text>
              <Text style={styles.quickButtonDesc}>
                Para Android Emulator (AVD)
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(ENVIRONMENTS.production.apiUrl)}>
            <View>
              <Text style={styles.quickButtonTitle}>
                Servidor de Produção
              </Text>
              <Text style={styles.quickButtonUrl}>
                {ENVIRONMENTS.production.apiUrl}
              </Text>
              <Text style={styles.quickButtonDesc}>
                Servidor online studesk.pro
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              Para celular físico via ADB:
            </Text>
            <Text style={styles.infoText}>
              1. Descubra o IP da sua máquina:{'\n'}
              {'   '}Linux/Mac: ifconfig | grep "inet "
              {'\n'}
              {'   '}Windows: ipconfig
              {'\n'}
              2. Use: http://SEU_IP:3030/api{'\n'}
              {'   '}Exemplo: http://192.168.0.100:3030/api
            </Text>
          </View>
        </View>

        {/* URL Personalizada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>URL Personalizada</Text>
          <TextInput
            style={styles.input}
            value={customUrl}
            onChangeText={setCustomUrl}
            placeholder="https://exemplo.com/api"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* Botões */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={handleTestConnection}
            disabled={testing || saving}>
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Testar Conexão</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSave]}
            onPress={handleSaveUrl}
            disabled={testing || saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Salvar e Usar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonReset]}
            onPress={handleReset}
            disabled={testing || saving}>
            <Text style={[styles.buttonText, styles.buttonResetText]}>
              Resetar para Padrão
            </Text>
          </TouchableOpacity>
        </View>

        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 12,
  },
  currentUrlBox: {
    backgroundColor: '#1a1d24',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2d35',
  },
  currentUrlText: {
    fontSize: 14,
    color: '#d1d5db',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  quickButton: {
    backgroundColor: '#1a1d24',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2d35',
  },
  quickButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 4,
  },
  quickButtonUrl: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  quickButtonDesc: {
    fontSize: 11,
    color: '#4a4d55',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#1e2028',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a2d35',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  input: {
    backgroundColor: '#1a1d24',
    borderWidth: 1,
    borderColor: '#2a2d35',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonGroup: {
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonTest: {
    backgroundColor: '#3b82f6',
  },
  buttonSave: {
    backgroundColor: '#10b981',
  },
  buttonReset: {
    backgroundColor: '#1a1d24',
    borderWidth: 1,
    borderColor: '#2a2d35',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonResetText: {
    color: '#6b7280',
  },
  closeButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
