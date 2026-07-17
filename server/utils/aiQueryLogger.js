const AiQueryLog = require('../models/AiQueryLog');

// Fire-and-forget, same shape as utils/activityLogger.js — a logging
// failure must never break the request that triggered it.
// Deliberately does NOT accept a "content" field: this log exists to track
// AI feature usage/cost/latency, not to store what was generated or
// extracted (extracted document fields especially must never land here —
// see OCR privacy notes in the Milestone 2 plan).
async function logAiQuery({ feature, referenceId, referenceModel, admin, language, success, latencyMs, errorMessage }) {
  try {
    await AiQueryLog.create({ feature, referenceId, referenceModel, admin, language, success, latencyMs, errorMessage });
  } catch (err) {
    console.error('aiQueryLogger failed:', err.message);
  }
}

module.exports = { logAiQuery };
