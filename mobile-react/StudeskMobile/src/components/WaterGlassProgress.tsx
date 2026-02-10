import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface WaterGlassProgressProps {
  percentage: number; // 0-100
  color?: string;
}

export default function WaterGlassProgress({
  percentage,
  color = '#3b82f6',
}: WaterGlassProgressProps) {
  const waterLevel = Math.min(percentage, 100);

  // Cor da água com transparência
  const waterGradientTop = color + '99';
  const waterGradientBottom = color + 'EE';

  return (
    <View style={styles.container}>
      {/* Copo */}
      <View style={styles.glassContainer}>
        {/* Bordas do copo */}
        <View style={styles.glass}>
          {/* Água */}
          <View
            style={[
              styles.waterContainer,
              {
                height: `${waterLevel}%`,
              },
            ]}>
            {/* Gradiente da água (simulado com duas camadas) */}
            <View style={[styles.waterGradientTop, {backgroundColor: waterGradientTop}]} />
            <View style={[styles.water, {backgroundColor: waterGradientBottom}]} />

            {/* Bolhas de água */}
            {waterLevel > 10 && (
              <>
                <View style={[styles.bubble, styles.bubble1, {borderColor: color}]} />
                <View style={[styles.bubble, styles.bubble2, {borderColor: color}]} />
                {waterLevel > 50 && (
                  <View style={[styles.bubble, styles.bubble3, {borderColor: color}]} />
                )}
              </>
            )}
          </View>

          {/* Reflexo do vidro */}
          <View style={styles.glassShine} />
        </View>

        {/* Marcações de nível */}
        <View style={styles.markings}>
          {[25, 50, 75, 100].map(mark => (
            <View key={mark} style={styles.markLine}>
              <View style={styles.markDash} />
              <Text style={styles.markText}>{mark}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Percentual grande */}
      <Text style={[styles.percentage, {color}]}>
        {waterLevel.toFixed(0)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassContainer: {
    width: 70,
    height: 110,
    position: 'relative',
  },
  glass: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  waterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  waterGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  water: {
    flex: 1,
  },
  bubble: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bubble1: {
    bottom: '20%',
    left: '25%',
    width: 5,
    height: 5,
  },
  bubble2: {
    bottom: '45%',
    right: '30%',
    width: 4,
    height: 4,
  },
  bubble3: {
    bottom: '70%',
    left: '40%',
    width: 6,
    height: 6,
  },
  glassShine: {
    position: 'absolute',
    top: 10,
    left: 8,
    width: 15,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
  },
  markings: {
    position: 'absolute',
    right: -25,
    top: 0,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  markLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markDash: {
    width: 8,
    height: 1,
    backgroundColor: '#cbd5e1',
    marginRight: 4,
  },
  markText: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '600',
  },
  percentage: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
