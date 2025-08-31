import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Avatar, Title, Text, Card, List } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user?.name?.charAt(0) || 'U'}
          style={styles.avatar}
        />
        <Title style={styles.name}>{user?.name}</Title>
        <Text style={styles.usn}>{user?.usn}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader>Account Information</List.Subheader>
            <List.Item
              title="USN"
              description={user?.usn}
              left={props => <List.Icon {...props} icon="card-account-details" />}
            />
            <List.Item
              title="Role"
              description={user?.role}
              left={props => <List.Icon {...props} icon="account" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Subheader>App Information</List.Subheader>
            <List.Item
              title="Version"
              description="1.0.0"
              left={props => <List.Icon {...props} icon="information" />}
            />
            <List.Item
              title="Last Updated"
              description="2024-01-01"
              left={props => <List.Icon {...props} icon="clock" />}
            />
          </List.Section>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    marginBottom: 10,
    backgroundColor: '#6200ee',
  },
  name: {
    fontSize: 24,
    marginBottom: 5,
  },
  usn: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    margin: 16,
  },
});

export default ProfileScreen; 