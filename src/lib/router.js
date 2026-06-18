/**
 * Smart Router Engine
 * Scores AI models based on prompt text and routing rules
 */

export const DEFAULT_RULES = [
  { id: 'r1',  keyword: 'code',       tag: 'code',        weights: { chatgpt: 8, deepseek: 10, claude: 7, mistral: 6 } },
  { id: 'r2',  keyword: 'debug',      tag: 'code',        weights: { chatgpt: 8, deepseek: 10, claude: 7 } },
  { id: 'r3',  keyword: 'function',   tag: 'code',        weights: { deepseek: 9, chatgpt: 8, claude: 7 } },
  { id: 'r4',  keyword: 'math',       tag: 'math',        weights: { deepseek: 10, claude: 8, chatgpt: 7 } },
  { id: 'r5',  keyword: 'calculate',  tag: 'math',        weights: { deepseek: 9, claude: 8, chatgpt: 7 } },
  { id: 'r6',  keyword: 'research',   tag: 'research',    weights: { perplexity: 10, claude: 7, gemini: 8 } },
  { id: 'r7',  keyword: 'search',     tag: 'search',      weights: { perplexity: 10, you: 9, gemini: 7 } },
  { id: 'r8',  keyword: 'write',      tag: 'writing',     weights: { claude: 10, chatgpt: 8, gemini: 7 } },
  { id: 'r9',  keyword: 'essay',      tag: 'writing',     weights: { claude: 10, chatgpt: 8 } },
  { id: 'r10', keyword: 'translate',  tag: 'multilingual', weights: { mistral: 10, gemini: 9, chatgpt: 8 } },
  { id: 'r11', keyword: 'image',      tag: 'multimodal',  weights: { gemini: 10, chatgpt: 8, meta: 7 } },
  { id: 'r12', keyword: 'news',       tag: 'news',        weights: { perplexity: 10, grok: 9, you: 8 } },
  { id: 'r13', keyword: 'analyze',    tag: 'analysis',    weights: { claude: 10, chatgpt: 8, gemini: 7 } },
  { id: 'r14', keyword: 'summarize',  tag: 'analysis',    weights: { claude: 10, chatgpt: 8 } },
  { id: 'r15', keyword: 'explain',    tag: 'analysis',    weights: { claude: 9, chatgpt: 8, gemini: 7 } },
  { id: 'r16', keyword: 'python',     tag: 'code',        weights: { deepseek: 10, chatgpt: 9, claude: 8 } },
  { id: 'r17', keyword: 'javascript', tag: 'code',        weights: { deepseek: 10, chatgpt: 9, claude: 7 } },
  { id: 'r18', keyword: 'story',      tag: 'writing',     weights: { claude: 10, chatgpt: 8, gemini: 6 } },
];

/**
 * Score all models for a given prompt using routing rules
 * @param {string} prompt
 * @param {Array} rules - routing rules with keyword/weights
 * @param {Array} models - model configs
 * @returns {Array} models sorted by score descending, with score field added
 */
export function scoreModels(prompt, rules, models) {
  if (!prompt || !prompt.trim()) {
    return models.filter(m => m.enabled !== false).map(m => ({ ...m, score: 0 }));
  }

  const lower = prompt.toLowerCase();
  const scores = {};

  for (const rule of rules) {
    const keyword = rule.keyword?.toLowerCase();
    if (!keyword || !lower.includes(keyword)) continue;

    if (rule.weights) {
      // New format: weights per model id
      for (const [modelId, weight] of Object.entries(rule.weights)) {
        scores[modelId] = (scores[modelId] || 0) + weight;
      }
    } else if (rule.provider_id) {
      // Legacy format
      scores[rule.provider_id] = (scores[rule.provider_id] || 0) + (rule.weight || 1);
    }
  }

  const enabled = models.filter(m => m.enabled !== false);
  return enabled
    .map(m => ({ ...m, score: scores[m.id] || 0 }))
    .sort((a, b) => b.score - a.score);
}

export function getBestMatch(scored) {
  if (!scored || scored.length === 0) return null;
  const top = scored[0];
  return top.score > 0 ? top : scored[0]; // always return something
}
