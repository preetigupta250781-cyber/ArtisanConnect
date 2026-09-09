import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }: any) {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('artisan_id');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.card, styles.primaryCard]} 
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.cardTitle}>Add New Product</Text>
        <Text style={styles.cardSubtitle}>Take a photo and use AI</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.card, styles.secondaryCard]} 
        onPress={() => navigation.navigate('MyListings')}
      >
        <Text style={styles.icon}>📦</Text>
        <Text style={styles.cardTitle}>My Listings</Text>
        <Text style={styles.cardSubtitle}>View published products</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: '#e6f2ff',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  secondaryCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#dc3545',
    fontSize: 18,
    fontWeight: '600',
  },
});
