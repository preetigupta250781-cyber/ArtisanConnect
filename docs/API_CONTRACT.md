# API Contracts

This document outlines all internal APIs across the AI Service and the Backend Gateway.

---

## 🤖 AI Service (FastAPI)
**Base URL:** `http://localhost:8000`

### 1. Process/Enhance Image
- **Endpoint**: `POST /enhance-image`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `image`: File (The raw image of the product)
- **Response** (200 OK):
```json
{
  "processed_image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 2. Generate Listing from Audio
- **Endpoint**: `POST /generate-listing`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `voice_note`: File (Audio recording, `.wav` or `.m4a`)
  - `language`: String (Optional, default `"hi"`)
- **Response** (200 OK):
```json
{
  "title_en": "Handwoven Cotton Saree",
  "description_en": "A beautiful blue handwoven cotton saree...",
  "keywords": ["cotton", "handwoven", "saree", "blue"],
  "title_hi": "हाथ से बुनी सूती साड़ी",
  "description_hi": "एक खूबसूरत नीली हाथ से बुनी सूती साड़ी..."
}
```

### 3. Suggest Price
- **Endpoint**: `POST /suggest-price`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "description": "A beautiful blue handwoven cotton saree...",
  "keywords": ["cotton", "handwoven", "saree", "blue"]
}
```
- **Response** (200 OK):
```json
{
  "price_min": 1500,
  "price_max": 3000,
  "currency": "INR",
  "reasoning": "Similar handwoven saree items are typically listed between ₹1500-3000",
  "matched_category": "handwoven saree"
}
```

---

## 🌐 Backend Gateway (Node.js/Express)
**Base URL:** `http://localhost:3000`

### 1. Artisan Login
- **Endpoint**: `POST /api/auth/login`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "phone": "+919876543210"
}
```
- **Response** (200 OK):
```json
{
  "artisan_id": "b3e945c7-1234-5678-abcd-123456789abc"
}
```

### 2. Process Image (Proxy to AI + Supabase Upload)
- **Endpoint**: `POST /api/products/process-image`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `image`: File
- **Response** (200 OK):
```json
{
  "public_url": "https://your-supabase-project.supabase.co/storage/v1/object/public/product-images/product_1693000000.png"
}
```

### 3. Generate Listing (Proxy to AI)
- **Endpoint**: `POST /api/products/generate-listing`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `voice_note`: File
  - `language`: String (Optional, default `"hi"`)
- **Response** (200 OK):
*(Same as AI Service Generate Listing Response)*

### 4. Suggest Price (Proxy to AI)
- **Endpoint**: `POST /api/products/suggest-price`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "description": "...",
  "keywords": ["..."]
}
```
- **Response** (200 OK):
*(Same as AI Service Suggest Price Response)*

### 5. Publish Final Product
- **Endpoint**: `POST /api/products`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "artisan_id": "b3e945c7-1234-5678-abcd-123456789abc",
  "image_url": "https://...",
  "title_en": "Handwoven Cotton Saree",
  "description_en": "A beautiful blue handwoven cotton saree...",
  "title_hi": "हाथ से बुनी सूती साड़ी",
  "description_hi": "एक खूबसूरत नीली हाथ से बुनी सूती साड़ी...",
  "keywords": ["cotton", "saree"],
  "price_min": 1500,
  "price_max": 3000,
  "final_price": 2500
}
```
- **Response** (200 OK): *(Returns the created DB row)*

### 6. Get Artisan's Products
- **Endpoint**: `GET /api/products?artisan_id={artisan_id}`
- **Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "artisan_id": "uuid",
    "image_url": "...",
    "title_en": "...",
    "status": "published",
    "final_price": 2500,
    "created_at": "..."
  }
]
```
