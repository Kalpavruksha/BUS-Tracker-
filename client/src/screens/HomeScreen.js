import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const theme = useTheme();

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.welcomeText}>
          Welcome, {user?.name || 'User'}!
        </Title>
        <Button onPress={handleLogout}>Logout</Button>
      </View>

      <View style={styles.cardsContainer}>
        <Card
          style={styles.card}
          onPress={() => navigation.navigate('Map')}
        >
          <Card.Content>
            <Title>Live Bus Tracking</Title>
            <Paragraph>
              Track buses in real-time on the map
            </Paragraph>
          </Card.Content>
        </Card>

        <Card
          style={styles.card}
          onPress={() => navigation.navigate('RouteDetails')}
        >
          <Card.Content>
            <Title>Bus Routes</Title>
            <Paragraph>
              View all available bus routes and schedules
            </Paragraph>
          </Card.Content>
        </Card>

        <Card
          style={styles.card}
          onPress={() => navigation.navigate('Profile')}
        >
          <Card.Content>
            <Title>Profile</Title>
            <Paragraph>
              View and update your profile information
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcomeText: {
    fontSize: 20,
  },
  cardsContainer: {
    padding: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 4,
  },
});

export default HomeScreen; 