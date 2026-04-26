/**
 * AI Candidate Ranker
 * Priority order: Groq (free) → xAI Grok → Google Gemini
 */

const { ChatOpenAI } = require('@langchain/openai');
const { ChatGroq } = require('@langchain/groq');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

// Singleton LLM instances — reset to null to force recreation after errors
let groqLlm = null;
let xaiLlm = null;
let geminiLlm = null;

// ==================== CONTENT NORMALIZATION ====================

function normalizeModelContent(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (typeof part?.text === 'string') return part.text;
                return '';
            })
            .join('\n')
            .trim();
    }
    return String(content);
}

function tryParseScoreAndSummary(rawText) {
    const text = (rawText || '').trim();
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                score: Math.min(100, Math.max(0, parseInt(parsed.score, 10) || 0)),
                summary: (parsed.summary || '').trim() || 'No summary provided.',
            };
        } catch (e) {
            // Fall through to heuristic parsing.
        }
    }

    // Heuristic fallback: extract first score-like number from plain text.
    const scoreMatch = text.match(/(?:score\s*[:=-]?\s*)?(\d{1,3})(?:\s*\/\s*100|\s*%)/i)
        || text.match(/score\s*[:=-]?\s*(\d{1,3})/i);
    const parsedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    const cleanedSummary = text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        score: Math.min(100, Math.max(0, Number.isNaN(parsedScore) ? 0 : parsedScore)),
        summary: cleanedSummary.slice(0, 320) || 'No summary provided.',
    };
}

// ==================== TEXT HELPERS ====================

function compactText(text, maxChars) {
    if (!text) return '';
    const normalized = String(text).replace(/\s+/g, ' ').trim();
    return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
}

function buildResumeSnippet(resumeText) {
    if (!resumeText) return '';

    const lines = String(resumeText)
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    const priorityKeywords = [
        'experience', 'project', 'skill', 'summary', 'education', 'certification',
        'technolog', 'react', 'node', 'python', 'java', 'javascript', 'typescript',
        'aws', 'docker', 'kubernetes', 'mongodb', 'sql'
    ];

    const important = lines.filter(line => {
        const lower = line.toLowerCase();
        return priorityKeywords.some(k => lower.includes(k));
    });

    const merged = [...lines.slice(0, 35), ...important.slice(0, 70)].join('\n');
    return compactText(merged || lines.join('\n'), 4500);
}

function buildJobSnippet(job) {
    return compactText(
        [
            `TITLE: ${job.title || ''}`,
            `COMPANY: ${job.company || ''}`,
            `DESCRIPTION: ${job.description || ''}`,
            `REQUIREMENTS: ${(job.requirements || []).join(', ')}`,
            `SKILLS: ${(job.skills || []).join(', ')}`,
        ].join('\n'),
        2600
    );
}

// ==================== LLM FACTORIES ====================

function getGroqLLM() {
    if (!groqLlm) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not set in .env');
        groqLlm = new ChatGroq({
            model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
            apiKey,
            temperature: 0.2,
            maxTokens: 512,
        });
    }
    return groqLlm;
}

function getXaiLLM() {
    if (!xaiLlm) {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) throw new Error('XAI_API_KEY not set in .env');
        xaiLlm = new ChatOpenAI({
            model: process.env.XAI_MODEL || 'grok-3-latest',
            apiKey,
            temperature: 0.2,
            maxTokens: 512,
            configuration: { baseURL: 'https://api.x.ai/v1' },
        });
    }
    return xaiLlm;
}

function getGeminiLLM() {
    if (!geminiLlm) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey || apiKey === 'your_google_api_key_here') throw new Error('GOOGLE_API_KEY not set in .env');
        geminiLlm = new ChatGoogleGenerativeAI({
            model: process.env.GOOGLE_MODEL || 'gemini-1.5-flash',
            apiKey,
            temperature: 0.2,
            maxOutputTokens: 512,
        });
    }
    return geminiLlm;
}

// ==================== ERROR CLASSIFIERS ====================

function isQuotaOrRateError(err) {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('429') || msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many requests');
}

function isAuthOrCreditError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const is403 = msg.includes('403') &&
        (msg.includes('credit') || msg.includes('license') || msg.includes('forbidden') || msg.includes('team'));
    const isModelMissing = msg.includes('404') || msg.includes('model not found') || msg.includes('does not exist') || msg.includes('not supported');
    return is403 || isModelMissing;
}

function isFatalError(err) {
    return isQuotaOrRateError(err) || isAuthOrCreditError(err);
}

// ==================== INVOKE HELPER ====================

async function invokeModel(model, systemPrompt, userMessage) {
    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage),
    ]);
    const content = normalizeModelContent(response.content);
    const parsed = tryParseScoreAndSummary(content);
    if (!parsed) throw new Error('No parsable AI response');
    return parsed;
}

// ==================== MAIN SCORER ====================

/**
 * Score a single candidate resume against a job posting.
 * Tries: Groq → xAI → Gemini (in that order).
 * @param {object} job - Job document { title, description, requirements, skills }
 * @param {object} candidate - { name, resumeText, coverLetter }
 * @returns {{ score: number, summary: string }}
 */
async function scoreCandidate(job, candidate) {
    const condensedResume = buildResumeSnippet(candidate.resumeText);
    const condensedCoverLetter = compactText(candidate.coverLetter, 1200);
    const condensedJob = buildJobSnippet(job);

    const systemPrompt = `You are an expert HR recruiter AI. Your task is to evaluate how well a candidate's resume matches a job description.
Respond ONLY with valid JSON in this exact format:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentences explaining the match>"
}
Do NOT include any other text outside the JSON.
If resume text is missing, still provide a low-confidence score and explain what is missing.`;

    const resumeContext = `
CANDIDATE NAME: ${candidate.name}
RESUME TEXT:
${condensedResume || '(No resume uploaded or extracted text unavailable)'}
${condensedCoverLetter ? `\nCOVER LETTER:\n${condensedCoverLetter}` : ''}
`.trim();

    const userMessage = `Please evaluate this candidate for the job.\n\nJOB CONTEXT:\n${condensedJob}\n\n${resumeContext}`;

    // --- Try Groq (primary, free tier) ---
    try {
        const model = getGroqLLM();
        const result = await invokeModel(model, systemPrompt, userMessage);
        console.log(`[AI] ✅ Groq scored ${candidate.name}: ${result.score}`);
        return result;
    } catch (err) {
        if (isFatalError(err)) {
            // Reset singleton so it gets recreated fresh next time
            groqLlm = null;
            console.warn(`[AI] Groq failed for ${candidate.name}: ${err.message.slice(0, 120)}`);
        } else {
            console.error(`[AI] Groq unexpected error for ${candidate.name}:`, err.message);
        }
    }

    // --- Try xAI Grok (secondary) ---
    try {
        const model = getXaiLLM();
        const result = await invokeModel(model, systemPrompt, userMessage);
        console.log(`[AI] ✅ xAI scored ${candidate.name}: ${result.score}`);
        return result;
    } catch (err) {
        if (isFatalError(err)) {
            xaiLlm = null;
            console.warn(`[AI] xAI failed for ${candidate.name}: ${err.message.slice(0, 120)}`);
        } else {
            console.error(`[AI] xAI unexpected error for ${candidate.name}:`, err.message);
        }
    }

    // --- Try Gemini (final fallback) ---
    try {
        const model = getGeminiLLM();
        const result = await invokeModel(model, systemPrompt, userMessage);
        console.log(`[AI] ✅ Gemini scored ${candidate.name}: ${result.score}`);
        return result;
    } catch (err) {
        if (isFatalError(err)) {
            geminiLlm = null;
            console.warn(`[AI] Gemini failed for ${candidate.name}: ${err.message.slice(0, 120)}`);
        } else {
            console.error(`[AI] Gemini unexpected error for ${candidate.name}:`, err.message);
        }
    }

    // All models failed
    console.error(`[AI] ❌ All models failed for candidate: ${candidate.name}`);
    return {
        score: 0,
        summary: 'AI analysis unavailable — all API providers failed. Please check your API keys and quotas.',
    };
}

/**
 * Rank all candidates for a job
 * @param {object} job - Job document
 * @param {Array} applications - Array of application docs with populated candidate + resumeText
 * @returns {Array} Applications sorted by score descending
 */
async function rankAllCandidates(job, applications) {
    const results = await Promise.all(
        applications.map(async (app) => {
            const result = await scoreCandidate(job, {
                name: app.candidate?.name || 'Unknown',
                resumeText: app.resumeText || app.candidate?.resume?.text || '',
                coverLetter: app.coverLetter || '',
            });
            return { appId: app._id, ...result };
        })
    );
    return results.sort((a, b) => b.score - a.score);
}

module.exports = { scoreCandidate, rankAllCandidates };
