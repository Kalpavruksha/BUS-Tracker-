import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Logo = ({ size = 'medium' }) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: 80, height: 40, fontSize: 16 };
      case 'large':
        return { width: 160, height: 80, fontSize: 32 };
      default:
        return { width: 120, height: 60, fontSize: 24 };
    }
  };

  const dimensions = getSize();

  return (
    <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
      <View style={styles.circle}>
        <Text style={[styles.text, { fontSize: dimensions.fontSize }]}>ER</Text>
      </View>
      <Text style={[styles.subtext, { fontSize: dimensions.fontSize * 0.4 }]}>Ease Route</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: '100%',
    height: '70%',
    borderRadius: 50,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
  subtext: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default Logo; 