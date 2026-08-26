require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// ── NVIDIA NIM Client (OpenAI-compatible) ────────────────────────────────────
const nvidiaNimClient = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY || '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'
});

const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the project root
app.use(express.static(__dirname));

/**
 * NVIDIA NIM AI Proxy Endpoint
 * Uses the OpenAI-compatible SDK to call NVIDIA's NIM endpoint.
 * Supports streaming SSE, reasoning_content (chain-of-thought), and tool_calls.
 */
app.post('/api/proxy', async (req, res) => {
    // Accept either a raw OpenAI-style body OR the legacy { url, data, stream } wrapper
    let body = req.body;

    // Legacy wrapper support: { url, method, headers, data, stream }
    if (body.url && body.data) {
        body = { ...body.data, stream: body.stream !== undefined ? body.stream : body.data.stream };
    }

    const {
        messages,
        temperature = 1,
        top_p = 0.95,
        max_tokens = 16384,
        stream = true,
        tools,
        tool_choice = 'auto',
        model
    } = body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: '"messages" array is required.' });
    }

    const selectedModel = model || NVIDIA_MODEL;
    console.log(`[NVIDIA NIM] ${stream ? 'Streaming' : 'Non-streaming'} request → model: ${selectedModel}`);

    try {
        const completionParams = {
            model: selectedModel,
            messages,
            temperature,
            top_p,
            max_tokens,
            stream,
            chat_template_kwargs: { enable_thinking: true },
            reasoning_budget: 16384
        };

        if (tools && Array.isArray(tools) && tools.length > 0) {
            completionParams.tools = tools;
            completionParams.tool_choice = tool_choice;
        }

        if (stream) {
            // ── Streaming path: forward SSE chunks to client ─────────────────
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const completion = await nvidiaNimClient.chat.completions.create(completionParams);

            for await (const chunk of completion) {
                if (!chunk.choices || chunk.choices.length === 0) continue;

                const delta = chunk.choices[0].delta;

                // Forward reasoning/thinking tokens
                const reasoningContent = delta.reasoning_content;
                if (reasoningContent) {
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: reasoningContent, content: null } }] })}\n\n`);
                }

                // Forward normal content tokens
                if (delta.content != null) {
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta.content } }] })}\n\n`);
                }

                // Forward tool_calls
                if (delta.tool_calls) {
                    res.write(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: delta.tool_calls } }] })}\n\n`);
                }
            }

            res.write('data: [DONE]\n\n');
            res.end();

        } else {
            // ── Non-streaming path: return full JSON response ─────────────────
            const completion = await nvidiaNimClient.chat.completions.create(completionParams);
            res.json(completion);
        }

    } catch (error) {
        const status = error.status || (error.response ? error.response.status : 500);
        const message = error.message || 'Unknown NVIDIA NIM error';
        console.error(`[NVIDIA NIM Error] ${status}:`, message);
        if (!res.headersSent) {
            res.status(status).json({ error: message });
        } else {
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            res.end();
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
