require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';
const NVIDIA_RAW_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the project root
app.use(express.static(__dirname));

/**
 * AI Proxy Endpoint
 * Proxies requests to NVIDIA NIM endpoint.
 * Supports streaming SSE, non-streaming, and legacy { url, data, stream } format.
 */
app.post('/api/proxy', async (req, res) => {
    let body = req.body;
    let targetUrl = NVIDIA_RAW_ENDPOINT;
    let headers = {
        'Content-Type': 'application/json'
    };
    let data = body;

    // Support legacy wrapper { url, method, headers, data, stream }
    if (body.url && body.data) {
        targetUrl = body.url || targetUrl;
        data = body.data;
    }

    let apiKey = NVIDIA_API_KEY;
    if (body.headers && body.headers.Authorization && !body.headers.Authorization.includes('YOUR_NVIDIA')) {
        const clientKey = body.headers.Authorization.replace('Bearer ', '').trim();
        if (clientKey) apiKey = clientKey;
    }
    headers['Authorization'] = 'Bearer ' + apiKey;

    if (!data.model || data.model.includes('llama-3.3-70b')) {
        data.model = NVIDIA_MODEL;
    }

    // Ensure thinking traces are turned off so response is direct dialogue
    if (!data.chat_template_kwargs) {
        data.chat_template_kwargs = { enable_thinking: false };
    }

    const isStream = data.stream === true || body.stream === true;

    try {
        console.log(`[AI Proxy] ${isStream ? 'Streaming' : 'Non-streaming'} request -> model: ${data.model}`);

        if (isStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const response = await axios({
                url: targetUrl,
                method: 'POST',
                headers: headers,
                data: data,
                responseType: 'stream',
                timeout: 60000
            });

            response.data.on('data', chunk => {
                res.write(chunk);
            });

            response.data.on('end', () => {
                res.end();
            });

            response.data.on('error', err => {
                console.error('[AI Proxy Stream Error]:', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.end();
                }
            });
        } else {
            const response = await axios({
                url: targetUrl,
                method: 'POST',
                headers: headers,
                data: data,
                timeout: 60000
            });
            res.json(response.data);
        }
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        let errMsg = error.message;
        if (error.response && error.response.data) {
            try {
                if (typeof error.response.data === 'string') errMsg = error.response.data;
                else errMsg = JSON.stringify(error.response.data);
            } catch (e) { }
        }
        console.error(`[AI Proxy Error] ${status}: ${errMsg}`);
        if (!res.headersSent) {
            res.status(status).json({ error: errMsg });
        } else {
            res.end();
        }
    }
});

/**
 * Dedicated ElevenLabs TTS Proxy
 * The local server proxies ElevenLabs audio (binary streaming)
 * to avoid CORS and API key exposure in browser.
 */
app.post('/api/elevenlabs', async (req, res) => {
    let { voiceId, apiKey, text, modelId, voiceSettings } = req.body;

    // Inject server-side API key and voice ID if client has placeholder or missing
    if (!apiKey || apiKey.includes('YOUR_ELEVENLABS')) {
        apiKey = process.env.ELEVENLABS_API_KEY || apiKey;
    }
    if (!voiceId || voiceId.includes('YOUR_')) {
        voiceId = process.env.ELEVENLABS_VOICE_ID || voiceId || '7ddqsJSJmhrKwkSMqFJq';
    }

    if (!apiKey || apiKey.includes('YOUR_ELEVENLABS')) {
        console.log('[ElevenLabs] No valid API key configured (using fallback browser TTS)');
        return res.status(401).json({ error: 'ElevenLabs API key not configured. Fallback to Browser Speech active.' });
    }

    if (!voiceId || !text) {
        return res.status(400).json({ error: 'voiceId and text are required.' });
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
            responseType: 'arraybuffer',
            timeout: 30000
        });

        console.log(`[ElevenLabs] Success! Audio size: ${response.data.byteLength} bytes`);

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
            } catch (e) { }
        }
        console.error(`[ElevenLabs Error] ${status}: ${errorMsg}`);
        if (!res.headersSent) {
            res.status(status).json({ error: errorMsg });
        }
    }
});

const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('       MANEKI NEKO — SMART RESTAURANT');
    console.log('       Local Server (AI Proxy + Static + TTS)');
    console.log('='.repeat(50));
    console.log(`\n🚀 Server running at:  http://localhost:${PORT}`);
    console.log(`📂 Static files:       ${__dirname}`);
    console.log(`🤖 AI Proxy:          http://localhost:${PORT}/api/proxy`);
    console.log(`🎙️ Voice Proxy:        http://localhost:${PORT}/api/elevenlabs`);
    console.log('\nUse "npm start" to keep this server running.\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n⚠️ Port ${PORT} is already in use by another running process.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});