import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  AddProduct: undefined;
  MyListings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const artisanId = await AsyncStorage.getItem('artisan_id');
        if (artisanId) {
          setInitialRoute('Home');
        }
      } catch (e) {
        // Error reading value
      } finally {
        setIsLoading(false);
      }
    };
    checkLogin();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Add New Product' }} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: 'My Listings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
