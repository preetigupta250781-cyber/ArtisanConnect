import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

export default function AddProductScreen({ navigation }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  // Step 2 State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [listingData, setListingData] = useState<any>(null);

  // Step 3 State
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<string>('');

  const handleNetworkError = (err: any, retryAction: () => void) => {
    setError(err.message || 'Network error occurred');
    Alert.alert('Error', err.message || 'Network error occurred', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retry', onPress: retryAction }
    ]);
  };

  // --- STEP 1: Image Capture ---
  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert('Permission required');
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setOriginalImage(uri);
        await processImage(uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const processImage = async (uri: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData() as any;
      const filename = uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', { uri, name: filename, type });

      const response = await api.post('/api/products/process-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProcessedImageUrl(response.data.public_url);
    } catch (err: any) {
      handleNetworkError(err, () => processImage(uri));
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: Voice Note ---
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Permission required');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err: any) {
      Alert.alert('Failed to start recording', err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) await generateListing(uri);
  };

  const generateListing = async (uri: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData() as any;
      const filename = uri.split('/').pop() || 'voice.m4a';
      formData.append('voice_note', { uri, name: filename, type: 'audio/m4a' });
      formData.append('language', 'hi');

      const response = await api.post('/api/products/generate-listing', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setListingData(response.data);
      await fetchPriceSuggestion(response.data.description_en, response.data.keywords);
    } catch (err: any) {
      handleNetworkError(err, () => generateListing(uri));
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 3: Review & Publish ---
  const fetchPriceSuggestion = async (description: string, keywords: string[]) => {
    try {
      const response = await api.post('/api/products/suggest-price', { description, keywords });
      setPriceMin(response.data.price_min);
      setPriceMax(response.data.price_max);
      setFinalPrice(Math.round((response.data.price_min + response.data.price_max) / 2).toString());
    } catch (err) {
      console.error('Price suggestion failed', err);
    }
  };

  const handlePublish = async () => {
    if (!finalPrice || isNaN(Number(finalPrice))) return Alert.alert('Error', 'Enter a valid price');
    setLoading(true);
    try {
      const artisanId = await AsyncStorage.getItem('artisan_id');
      await api.post('/api/products', {
        artisan_id: artisanId,
        image_url: processedImageUrl,
        title_en: listingData.title_en,
        description_en: listingData.description_en,
        title_hi: listingData.title_hi,
        description_hi: listingData.description_hi,
        keywords: listingData.keywords,
        price_min: priceMin,
        price_max: priceMax,
        final_price: Number(finalPrice),
      });
      Alert.alert('Success', 'Product published!');
      navigation.replace('MyListings');
    } catch (err: any) {
      handleNetworkError(err, handlePublish);
      setLoading(false);
    }
  };

  // --- Renders ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      {step === 1 && (
        <View>
          <Text style={styles.stepTitle}>Step 1: Product Photo</Text>
          {processedImageUrl ? (
            <View>
              <Image source={{ uri: processedImageUrl }} style={styles.previewImage} />
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(2)}>
                <Text style={styles.buttonText}>Looks Good! Next →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
                <Text style={styles.icon}>📷</Text>
                <Text style={styles.buttonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
                <Text style={styles.icon}>🖼️</Text>
                <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.stepTitle}>Step 2: Describe your Product</Text>
          <Text style={styles.subtitle}>Hold the button and speak in Hindi or English</Text>
          
          {listingData ? (
            <View>
              <Text style={styles.successText}>✨ Description generated!</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
                <Text style={styles.buttonText}>Review & Price →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.recordButton, recording && styles.recordingActive]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <Text style={styles.recordIcon}>🎙️</Text>
              <Text style={styles.buttonText}>{recording ? 'Recording... Release to Stop' : 'Hold to Record'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {step === 3 && listingData && (
        <View>
          <Text style={styles.stepTitle}>Step 3: Review & Publish</Text>
          <Image source={{ uri: processedImageUrl! }} style={styles.smallPreview} />
          
          <Text style={styles.label}>Title (English)</Text>
          <TextInput style={styles.input} value={listingData.title_en} onChangeText={(t) => setListingData({...listingData, title_en: t})} />
          
          <Text style={styles.label}>Description (English)</Text>
          <TextInput style={styles.inputMultiline} multiline value={listingData.description_en} onChangeText={(t) => setListingData({...listingData, description_en: t})} />
          
          <Text style={styles.label}>Suggested Price Range (₹)</Text>
          <Text style={styles.priceRange}>{priceMin} - {priceMax}</Text>

          <Text style={styles.label}>Your Final Price (₹)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            value={finalPrice} 
            onChangeText={setFinalPrice} 
          />

          <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
            <Text style={styles.buttonText}>Publish Product 🚀</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  loadingText: { marginTop: 16, fontSize: 18, color: '#333' },
  stepTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 32, textAlign: 'center' },
  previewImage: { width: '100%', height: 300, borderRadius: 12, marginBottom: 24, resizeMode: 'contain', backgroundColor: '#f0f0f0' },
  smallPreview: { width: 150, height: 150, borderRadius: 8, alignSelf: 'center', marginBottom: 24, backgroundColor: '#f0f0f0' },
  primaryButton: { backgroundColor: '#007bff', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center' },
  secondaryButton: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'center' },
  recordButton: { backgroundColor: '#28a745', padding: 40, borderRadius: 100, alignItems: 'center', marginVertical: 32 },
  recordingActive: { backgroundColor: '#dc3545' },
  publishButton: { backgroundColor: '#28a745', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  secondaryButtonText: { color: '#333', fontSize: 20, fontWeight: 'bold' },
  icon: { fontSize: 28, marginRight: 12 },
  recordIcon: { fontSize: 64, marginBottom: 16 },
  successText: { fontSize: 20, color: '#28a745', textAlign: 'center', marginBottom: 24, fontWeight: 'bold' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  input: { borderWidth: 2, borderColor: '#ddd', borderRadius: 8, padding: 16, fontSize: 18, marginBottom: 20 },
  inputMultiline: { borderWidth: 2, borderColor: '#ddd', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 20, minHeight: 100, textAlignVertical: 'top' },
  priceRange: { fontSize: 24, color: '#007bff', fontWeight: 'bold', marginBottom: 20 },
});
