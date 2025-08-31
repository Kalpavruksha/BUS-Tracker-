import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { validateUSN } from '../utils/validation';
import Logo from '../components/Logo';

const LoginScreen = ({ navigation }) => {
  const [usn, setUsn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDriver, setIsDriver] = useState(false);

  const handleLogin = () => {
    if (isDriver) {
      // Driver login validation
      if (!usn || !password) {
        setError('Please enter both Bus ID and password');
        return;
      }
      // For demo, allow any non-empty credentials
      setError('');
      navigation.replace('DriverDashboard', { busId: usn });
    } else {
      // Student login validation
      const validation = validateUSN(usn);
      if (!validation.isValid) {
        setError(validation.message);
        return;
      }

      if (password !== usn) {
        setError('Password must match your USN');
        return;
      }

      setError('');
      navigation.replace('MainApp');
    }
  };

  return (
    <View style={styles.container}>
      <Logo size="large" />
      <Text style={styles.subtitle}>
        {isDriver ? 'Driver Login' : 'Student Login'}
      </Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, !isDriver && styles.activeToggle]}
          onPress={() => setIsDriver(false)}
        >
          <Text style={[styles.toggleText, !isDriver && styles.activeToggleText]}>
            Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, isDriver && styles.activeToggle]}
          onPress={() => setIsDriver(true)}
        >
          <Text style={[styles.toggleText, isDriver && styles.activeToggleText]}>
            Driver
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={isDriver ? "Enter Bus ID" : "Enter USN"}
          value={usn}
          onChangeText={setUsn}
          autoCapitalize="characters"
          maxLength={isDriver ? 10 : 10}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="characters"
          maxLength={10}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      {!isDriver && (
        <Text style={styles.helpText}>
          Your USN is your username and password
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
  },
  activeToggleText: {
    color: 'white',
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  helpText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});

export default LoginScreen; 