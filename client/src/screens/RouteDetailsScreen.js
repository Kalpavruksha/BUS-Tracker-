import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, List, Divider } from 'react-native-paper';
import axios from 'axios';

const RouteDetailsScreen = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/routes');
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {routes.map(route => (
        <Card key={route._id} style={styles.card}>
          <Card.Content>
            <Title>{route.name}</Title>
            {route.description && (
              <Paragraph style={styles.description}>
                {route.description}
              </Paragraph>
            )}
            
            <List.Section>
              <List.Subheader>Bus Stops</List.Subheader>
              {route.stops.map((stop, index) => (
                <React.Fragment key={index}>
                  <List.Item
                    title={stop.name}
                    description={`Arrival Time: ${stop.arrivalTime}`}
                    left={props => <List.Icon {...props} icon="bus-stop" />}
                  />
                  {index < route.stops.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List.Section>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 16,
  },
});

export default RouteDetailsScreen; 