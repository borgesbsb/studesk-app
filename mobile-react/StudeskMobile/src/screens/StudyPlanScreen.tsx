import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

export default function StudyPlanScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plano de Estudos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.placeholder}>
          Organize e acompanhe seu plano de estudos personalizado.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
  },
  header: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: '#1a1d24',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#1a1d24',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2d35',
  },
  placeholder: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    textAlign: 'center',
  },
});
