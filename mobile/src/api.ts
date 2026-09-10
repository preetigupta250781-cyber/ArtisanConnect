import axios from 'axios';

// Create an Axios instance with the base URL
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000, // 10 seconds timeout as requested
});
