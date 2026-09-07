# ArtisanConnect

ArtisanConnect is a monorepo for a hackathon MVP. This repository contains the following services:

## Folder Structure

- `/ai-service`: Python FastAPI microservice for AI features (e.g., background removal, image processing, translations).
- `/backend`: Node.js + Express + TypeScript API gateway serving as the main backend.
- `/mobile`: Expo (React Native + TypeScript) app for the mobile client.
- `/docs`: Documentation, API contracts, and notes.

## How to Run Locally

### 1. AI Service
Navigate to the `ai-service` directory:
```bash
cd ai-service
```
Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Copy `.env.example` to `.env` and configure variables if any.
Run the service:
```bash
uvicorn main:app --reload --port 8000
```
Health Check: `GET http://localhost:8000/health`

### 2. Backend Gateway
Navigate to the `backend` directory:
```bash
cd backend
```
Install dependencies:
```bash
npm install
```
Copy `.env.example` to `.env` and configure variables.
Run the server:
```bash
npm run dev
```
Health Check: `GET http://localhost:3000/health`

### 3. Mobile App
Navigate to the `mobile` directory:
```bash
cd mobile
```
Install dependencies:
```bash
npm install
```
Copy `.env.example` to `.env` and configure variables.
Run the Expo app:
```bash
npx expo start
```
