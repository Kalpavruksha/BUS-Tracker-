import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo';

const HomeScreen = ({ navigation }) => {
  const routes = [
    {
      id: '1',
      name: 'Route 1',
      description: 'College to City Center',
      stops: ['College', 'Market', 'City Center'],
      time: '7:30 AM - 8:30 AM',
    },
    {
      id: '2',
      name: 'Route 2',
      description: 'College to Railway Station',
      stops: ['College', 'Bus Stand', 'Railway Station'],
      time: '8:00 AM - 9:00 AM',
    },
    {
      id: '3',
      name: 'Route 3',
      description: 'College to Airport',
      stops: ['College', 'Highway', 'Airport'],
      time: '9:00 AM - 10:00 AM',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Logo size="large" />
        <Text style={styles.welcomeText}>Welcome to Ease Route</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Available Routes</Text>
        
        {routes.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={styles.routeCard}
            onPress={() => navigation.navigate('Map', { routeId: route.id })}
          >
            <View style={styles.routeHeader}>
              <Text style={styles.routeName}>{route.name}</Text>
              <Text style={styles.routeTime}>{route.time}</Text>
            </View>
            <Text style={styles.routeDescription}>{route.description}</Text>
            <View style={styles.stopsContainer}>
              {route.stops.map((stop, index) => (
                <View key={index} style={styles.stopItem}>
                  <View style={styles.stopDot} />
                  <Text style={styles.stopText}>{stop}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  logo: {
    width: 100,
    height: 50,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  routeTime: {
    fontSize: 14,
    color: '#666',
  },
  routeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  stopsContainer: {
    marginTop: 10,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 10,
  },
  stopText: {
    fontSize: 14,
    color: '#333',
  },
});

export default HomeScreen; 