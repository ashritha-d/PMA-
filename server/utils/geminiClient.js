const axios = require('axios');

// Same REST endpoint/model already used by the chat feature (routes/ai.js),
// called directly rather than through the @google/generative-ai SDK — kept
// consistent so both features hit Gemini the same way.
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const GEMINI_URL = `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Single-turn text generation — one prompt in, one text response out.
// Not used by the existing streaming chat endpoint (which has its own
// multi-turn history handling); this is for one-shot features like
// description generation.
async function generateText(prompt, { maxOutputTokens = 1024, temperature = 0.7 } = {}) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens, temperature },
  };
  const res = await axios.post(GEMINI_URL, body, {
    timeout: 30000,
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
  });
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = { generateText };
