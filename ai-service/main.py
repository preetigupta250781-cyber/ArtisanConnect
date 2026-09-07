import io
import os
import time
import json
import hashlib
import base64
import requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from rembg import remove
from PIL import Image, ImageOps, ImageEnhance, ImageStat

try:
    from bhashini_translator import Bhashini
except ImportError:
    Bhashini = None


app = FastAPI(title="ArtisanConnect AI Service")

# In-memory cache for enhanced images
# Key: MD5 hash of the original input file bytes
# Value: Base64 string of the processed PNG
image_cache = {}

@app.get("/health")
def health_check():
    return {"status": "ok"}

def calculate_brightness(image: Image.Image) -> float:
    """Calculate the average pixel brightness of an image (0-255)."""
    grayscale = image.convert("L")
    stat = ImageStat.Stat(grayscale)
    return stat.mean[0]

def process_product_image(input_bytes: bytes) -> bytes:
    try:
        # 1. Load the original image
        img = Image.open(io.BytesIO(input_bytes))
        img = img.convert("RGB") # Ensures it's a readable image format
    except Exception:
        raise ValueError("Invalid image file format")

    # 2. Downscale to max 800px on the longest side first
    # This keeps processing time reasonable for CPU usage
    img.thumbnail((800, 800), Image.Resampling.LANCZOS)
    
    # Save the downscaled image to a buffer for rembg
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    downscaled_bytes = buf.getvalue()

    # 3. Remove background using rembg
    no_bg_bytes = remove(downscaled_bytes)
    no_bg_img = Image.open(io.BytesIO(no_bg_bytes)).convert("RGBA")

    # 4. Paste the foreground onto a plain white canvas
    white_bg = Image.new("RGBA", no_bg_img.size, "WHITE")
    white_bg.paste(no_bg_img, mask=no_bg_img)
    final_img = white_bg.convert("RGB")

    # 5. Auto-correct lighting/contrast
    final_img = ImageOps.autocontrast(final_img)

    # 6. Mild brightness boost if average brightness is below threshold
    brightness = calculate_brightness(final_img)
    if brightness < 110:  # Threshold for 'dark'
        enhancer = ImageEnhance.Brightness(final_img)
        final_img = enhancer.enhance(1.15) # 15% brightness boost

    # 7. Resize/pad the final image to a standard 1024x1024 square, centering the product
    target_size = (1024, 1024)
    
    # We want the product to fill a good portion of the 1024x1024 canvas.
    # Scale the extracted product up (or down) so its longest side is, say, 900px,
    # leaving a nice margin around it.
    final_img.thumbnail((900, 900), Image.Resampling.LANCZOS)
    
    padded_img = Image.new("RGB", target_size, "WHITE")
    
    # Center coordinates
    x = (target_size[0] - final_img.width) // 2
    y = (target_size[1] - final_img.height) // 2
    padded_img.paste(final_img, (x, y))

    # Output processed image to bytes
    out_buf = io.BytesIO()
    padded_img.save(out_buf, format="PNG")
    return out_buf.getvalue()

@app.post("/enhance-image")
async def enhance_image(image: UploadFile = File(...)):
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="No image file provided in the 'image' field")
    
    try:
        input_bytes = await image.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Error reading the uploaded file")
        
    if not input_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty")

    # Hash the input for the in-memory cache
    img_hash = hashlib.md5(input_bytes).hexdigest()
    
    if img_hash in image_cache:
        # Return cached result to save CPU cycles
        return {"processed_image_base64": image_cache[img_hash]}
        
    try:
        processed_bytes = process_product_image(input_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch unexpected errors from rembg/Pillow
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
        
    # Convert PNG bytes to base64
    base64_encoded = base64.b64encode(processed_bytes).decode("utf-8")
    
    # Save to cache
    image_cache[img_hash] = base64_encoded
    
    return {"processed_image_base64": base64_encoded}

@app.post("/generate-listing")
async def generate_listing(
    voice_note: UploadFile = File(...),
    language: str = Form("hi")
):
    print(f"--- Starting listing generation. Language: {language} ---")
    start_total = time.time()
    
    # Check credentials
    if not os.getenv("BHASHINI_USER_ID") or not os.getenv("BHASHINI_ULCA_KEY"):
        print("Warning: BHASHINI_USER_ID or BHASHINI_ULCA_KEY missing.")
    
    # We must set these so the Bhashini package can pick them up in __init__
    os.environ["userID"] = os.getenv("BHASHINI_USER_ID", "")
    os.environ["ulcaApiKey"] = os.getenv("BHASHINI_ULCA_KEY", "")
    
    # Also set default pipeline if needed (the package falls back to a default, but good to ensure it doesn't fail)
    
    try:
        audio_bytes = await voice_note.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Error reading the audio file")
        
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided")

    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    
    # Step 1: Transcribe + Translate (to English)
    t0 = time.time()
    english_text = ""
    try:
        if Bhashini is None:
            raise Exception("bhashini_translator is not installed.")
        bhashini_asr = Bhashini(sourceLanguage=language, targetLanguage="en")
        english_text = bhashini_asr.asr_nmt(audio_base64)
        print(f"Step 1 (ASR + Translate to EN) took {time.time() - t0:.2f}s. Text: '{english_text}'")
    except Exception as e:
        print(f"Bhashini Step 1 failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Bhashini API failed during transcription/translation: {str(e)}")

    # Step 2: Generate listing via Groq
    t0 = time.time()
    title_en = ""
    description_en = ""
    keywords = []
    
    try:
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY is not set.")
            
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = (
            "Turn the following raw spoken description into a product title (under 60 characters), "
            "a 2-3 sentence SEO-friendly description highlighting materials/craftsmanship, "
            "and 5 relevant keywords/tags. Return ONLY a JSON object with keys: 'title', 'description', 'keywords' (list of strings). "
            f"Raw text: {english_text}"
        )
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}
        }
        
        groq_response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        groq_response.raise_for_status()
        
        result_json = groq_response.json()["choices"][0]["message"]["content"]
        listing_data = json.loads(result_json)
        
        title_en = listing_data.get("title", "")
        description_en = listing_data.get("description", "")
        keywords = listing_data.get("keywords", [])
        print(f"Step 2 (Groq Listing Generation) took {time.time() - t0:.2f}s")
        
    except Exception as e:
        print(f"Step 2 (Groq) failed: {str(e)}. Falling back to raw text.")
        # Fallback: lightly clean up raw text
        title_en = english_text[:57] + "..." if len(english_text) > 60 else english_text
        description_en = english_text
        keywords = []

    # Step 3: Translate to Hindi
    t0 = time.time()
    title_hi = ""
    description_hi = ""
    
    try:
        if Bhashini is None:
            raise Exception("bhashini_translator is not installed.")
        bhashini_nmt = Bhashini(sourceLanguage="en", targetLanguage="hi")
        title_hi = bhashini_nmt.translate(title_en)
        description_hi = bhashini_nmt.translate(description_en)
        print(f"Step 3 (Translate to HI) took {time.time() - t0:.2f}s")
    except Exception as e:
        print(f"Bhashini Step 3 failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Bhashini API failed during Hindi translation: {str(e)}")

    print(f"--- Total generate-listing time: {time.time() - start_total:.2f}s ---")
    
    return {
        "title_en": title_en,
        "description_en": description_en,
        "keywords": keywords,
        "title_hi": title_hi,
        "description_hi": description_hi
    }
