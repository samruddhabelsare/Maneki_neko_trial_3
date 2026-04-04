require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the project root
app.use(express.static(__dirname));

/**
 * Generic Proxy Endpoint (for NVIDIA AI, etc.)
 * Handles JSON and streaming responses.
 */
app.post('/api/proxy', async (req, res) => {
    const { url, method, headers, data, stream } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required for proxying.' });
    }

    // Inject server-side API keys if client sends placeholders or empty keys
    if (url.includes('nvidia.com') && process.env.NVIDIA_API_KEY) {
        if (!headers['Authorization'] || headers['Authorization'].includes('YOUR_NVIDIA') || headers['Authorization'] === 'Bearer ') {
            headers['Authorization'] = `Bearer ${process.env.NVIDIA_API_KEY}`;
        }
    }

    try {
        console.log(`[Proxy] ${method || 'POST'} -> ${url}`);
        
        const axiosConfig = {
            url: url,
            method: method || 'POST',
            headers: {
                ...headers,
                'host': undefined,
                'origin': undefined,
                'referer': undefined
            },
            data: data || {},
            responseType: stream ? 'stream' : 'arraybuffer'
        };

        const response = await axios(axiosConfig);
        
        // Forward status and content-type
        res.status(response.status);
        if (response.headers['content-type']) {
            res.setHeader('content-type', response.headers['content-type']);
        }
        
        if (stream) {
            response.data.pipe(res);
        } else {
            res.send(Buffer.from(response.data));
        }
        
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        console.error(`[Proxy Error] ${status}:`, error.message);
        if (!res.headersSent) {
            res.status(status).json({ error: error.message });
        }
    }
});

/**
 * Dedicated ElevenLabs TTS Proxy
 * Properly handles binary audio/mpeg streaming back to the browser.
 * The client POSTs the voice params here and gets raw audio back.
 */
app.post('/api/elevenlabs', async (req, res) => {
    let { voiceId, apiKey, text, modelId, voiceSettings } = req.body;

    // Inject server-side API key if client has placeholder
    if (!apiKey || apiKey.includes('YOUR_ELEVENLABS')) {
        apiKey = process.env.ELEVENLABS_API_KEY || apiKey;
    }

    if (!voiceId || !apiKey || !text) {
        return res.status(400).json({ error: 'voiceId, apiKey, and text are required.' });
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
        console.log(`[ElevenLabs] Generating speech for: "${text.substring(0, 50)}..."`);

        const response = await axios({
            url: elevenLabsUrl,
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            data: {
                text: text,
                model_id: modelId || 'eleven_multilingual_v2',
                voice_settings: voiceSettings || {
                    stability: 0.45,
                    similarity_boost: 0.85,
                    style: 0.35,
                    use_speaker_boost: true
                }
            },
            responseType: 'arraybuffer',  // Critical: get raw binary
            timeout: 30000
        });

        console.log(`[ElevenLabs] Success! Audio size: ${response.data.byteLength} bytes`);

        // Set correct headers for audio playback
        res.status(200);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', response.data.byteLength);
        res.send(Buffer.from(response.data));

    } catch (error) {
        const status = error.response ? error.response.status : 500;
        let errorMsg = error.message;
        if (error.response && error.response.data) {
            try {
                errorMsg = Buffer.from(error.response.data).toString('utf-8');
            } catch(e) {}
        }
        console.error(`[ElevenLabs Error] ${status}: ${errorMsg}`);
        if (!res.headersSent) {
            res.status(status).json({ error: errorMsg });
        }
    }
});

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('       MANEKI NEKO — SMART RESTAURANT');
    console.log('       Local Server & AI Proxy');
    console.log('='.repeat(50));
    console.log(`\n🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📂 Static files:      ${__dirname}`);
    console.log(`🤖 AI Proxy:          http://localhost:${PORT}/api/proxy`);
    console.log(`🎙️ Voice Proxy:       http://localhost:${PORT}/api/elevenlabs`);
    console.log('\nUse "npm start" to keep this server running.\n');
});
