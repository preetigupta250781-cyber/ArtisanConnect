import io
import hashlib
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from rembg import remove
from PIL import Image, ImageOps, ImageEnhance, ImageStat

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
