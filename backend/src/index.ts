import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
// Initialize supabase client (mock connection is fine if keys are empty)
const supabase = createClient(supabaseUrl || 'https://mock.supabase.co', supabaseKey || 'mock-key');

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const upload = multer({ storage: multer.memoryStorage() });

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone is required' });

        let { data: artisan, error } = await supabase
            .from('artisans')
            .select('id')
            .eq('phone', phone)
            .single();

        // If not found, create a new artisan
        if (!artisan) {
            const { data: newArtisan, error: insertError } = await supabase
                .from('artisans')
                .insert([{ phone }])
                .select()
                .single();
            if (insertError) throw insertError;
            artisan = newArtisan;
        }

        if (!artisan) throw new Error('Could not fetch or create artisan');

        res.json({ artisan_id: artisan.id });
    } catch (err: any) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products/process-image
app.post('/api/products/process-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided' });

        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname || 'image.jpg',
            contentType: req.file.mimetype || 'image/jpeg',
        });

        // 1. Call AI service to process the image
        const aiResponse = await axios.post(`${aiServiceUrl}/enhance-image`, formData, {
            headers: formData.getHeaders(),
            timeout: 10000, // 10 seconds timeout
        });

        const base64Image = aiResponse.data.processed_image_base64;
        const imageBuffer = Buffer.from(base64Image, 'base64');
        const filename = `product_${Date.now()}.png`;

        // 2. Upload the processed image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('product-images')
            .upload(filename, imageBuffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 3. Get the public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('product-images')
            .getPublicUrl(filename);

        res.json({ public_url: publicUrlData.publicUrl });
    } catch (err: any) {
        console.error('Process image error:', err.message);
        const errorMessage = err.code === 'ECONNABORTED' ? 'AI Image processing took too long.' : (err.message || 'Error processing image');
        res.status(502).json({ error: errorMessage });
    }
});

// POST /api/products/generate-listing
app.post('/api/products/generate-listing', upload.single('voice_note'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No voice_note provided' });

        const formData = new FormData();
        formData.append('voice_note', req.file.buffer, {
            filename: req.file.originalname || 'voice.wav',
            contentType: req.file.mimetype || 'audio/wav',
        });
        
        if (req.body.language) {
            formData.append('language', req.body.language);
        }

        const aiResponse = await axios.post(`${aiServiceUrl}/generate-listing`, formData, {
            headers: formData.getHeaders(),
            timeout: 10000,
        });

        res.json(aiResponse.data);
    } catch (err: any) {
        console.error('Generate listing error:', err.message);
        const errorMessage = err.code === 'ECONNABORTED' ? 'AI Service timed out generating the listing.' : (err.message || 'Error generating listing');
        res.status(502).json({ error: errorMessage });
    }
});

// POST /api/products/suggest-price
app.post('/api/products/suggest-price', async (req, res) => {
    try {
        const { description, keywords } = req.body;
        if (!description || !keywords) return res.status(400).json({ error: 'Description and keywords are required' });

        const aiResponse = await axios.post(`${aiServiceUrl}/suggest-price`, {
            description,
            keywords
        }, { timeout: 10000 });

        res.json(aiResponse.data);
    } catch (err: any) {
        console.error('Suggest price error:', err.message);
        const errorMessage = err.code === 'ECONNABORTED' ? 'AI Pricing suggestion timed out.' : (err.message || 'Error suggesting price');
        res.status(502).json({ error: errorMessage });
    }
});

// POST /api/products
app.post('/api/products', async (req, res) => {
    try {
        // Accept final reviewed product data and set status to published
        const productData = { ...req.body, status: 'published' };
        
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err: any) {
        console.error('Create product error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products
app.get('/api/products', async (req, res) => {
    try {
        const { artisan_id } = req.query;
        if (!artisan_id) return res.status(400).json({ error: 'artisan_id is required' });

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('artisan_id', artisan_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (err: any) {
        console.error('Get products error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Backend API Gateway listening at http://localhost:${port}`);
});
