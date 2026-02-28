/**
 * Groq API Client for Ragnarok Battle Execution
 * Multi-judge panel: 3 independent LLMs score each battle
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
// Fallback models when primary is rate-limited (each has its own token bucket)
const FALLBACK_MODELS = ['llama-3.1-8b-instant', 'gemma2-9b-it'] as const;

// Multi-judge panel configuration
// Each judge has a Norse name, model, and weight for score aggregation
export const JUDGE_PANEL = [
  { id: 'odin', name: 'ODIN', model: 'llama-3.3-70b-versatile', weight: 0.50 },
  { id: 'thor', name: 'THOR', model: 'qwen/qwen3-32b', weight: 0.30 },
  { id: 'freya', name: 'FREYA', model: 'llama-3.1-8b-instant', weight: 0.20 },
] as const;

export type JudgeId = typeof JUDGE_PANEL[number]['id'];

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CallGroqOptions {
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  model?: string;
}

/**
 * Call Groq API with the given messages
 * @param options - Configuration for the API call
 * @returns The assistant's response content
 */
export async function callGroq(options: CallGroqOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const { messages, temperature = 0.7, maxTokens = 2048, systemPrompt, model } = options;

  const requestedModel = model || GROQ_MODEL;

  // Build model chain: requested model first, then fallbacks (skip duplicates)
  const modelChain = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)];

  // Prepend system prompt if provided
  const allMessages: GroqMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  let lastError: Error | null = null;

  for (const useModel of modelChain) {
    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: useModel,
          messages: allMessages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
    } catch (fetchError) {
      lastError = new Error(`Failed to connect to Groq API: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
      continue; // Try next model
    }

    const responseText = await response.text();

    if (!response.ok) {
      if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        throw new Error(`Groq API returned HTML instead of JSON (status ${response.status}). This usually means the API key is invalid or missing.`);
      }

      // Rate limit (429) or server error (5xx): try next model in chain
      if (response.status === 429 || response.status >= 500) {
        console.warn(`[Groq] ${useModel} returned ${response.status}, trying fallback...`);
        lastError = new Error(`Groq API error (${response.status}): ${responseText}`);
        continue;
      }

      throw new Error(`Groq API error (${response.status}): ${responseText}`);
    }

    let data: GroqResponse;
    try {
      data = JSON.parse(responseText);
    } catch {
      const preview = responseText.substring(0, 100);
      throw new Error(`Groq API returned invalid JSON. Response preview: ${preview}...`);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Groq API');
    }

    if (useModel !== requestedModel) {
      console.log(`[Groq] Used fallback model ${useModel} (requested: ${requestedModel})`);
    }

    return data.choices[0].message.content;
  }

  // All models exhausted
  throw lastError || new Error('Groq API call failed — all models rate-limited');
}

/**
 * Generate a response for an agent given a challenge
 */
export async function generateAgentResponse(
  agentName: string,
  agentSystemPrompt: string | null,
  challengePrompt: string
): Promise<string> {
  const defaultSystemPrompt = `You are a skilled AI warrior competing in Ragnarok arena. Give your best response.`;

  // Use agent's custom system prompt if available, otherwise use default
  const systemPrompt = agentSystemPrompt || defaultSystemPrompt;

  return callGroq({
    messages: [
      { role: 'user', content: challengePrompt }
    ],
    systemPrompt,
    temperature: 0.8,
    maxTokens: 1024, // Conserve token budget (100k/day free tier)
  });
}

/**
 * Judge two agent responses and determine scores
 */
export interface JudgeResult {
  scoreA: number;
  scoreB: number;
  winnerId: 'A' | 'B' | 'TIE';
  reasoning: string;
}

export async function judgeResponses(
  challenge: {
    name: string;
    type: string;
    prompt: unknown;
    expectedOutput: unknown;
  },
  agentAName: string,
  agentAResponse: string,
  agentBName: string,
  agentBResponse: string
): Promise<JudgeResult> {
  const systemPrompt = `You are the ALLFATHER JUDGE of Ragnarok, an impartial AI that scores battle responses.
You must evaluate both responses fairly based on the challenge criteria.
Score each response from 0-100 based on:
- Correctness/accuracy (40%)
- Completeness (30%)
- Clarity and presentation (20%)
- Creativity/elegance (10%)

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "scoreA": <number 0-100>,
  "scoreB": <number 0-100>,
  "reasoning": "<brief explanation of your scoring>"
}

Do not include any other text, markdown, or explanation outside the JSON.`;

  const prompt = typeof challenge.prompt === 'string'
    ? challenge.prompt
    : JSON.stringify(challenge.prompt);

  const criteria = typeof challenge.expectedOutput === 'string'
    ? challenge.expectedOutput
    : JSON.stringify(challenge.expectedOutput);

  const userMessage = `CHALLENGE: ${challenge.name}
TYPE: ${challenge.type}

PROMPT:
${prompt}

EVALUATION CRITERIA:
${criteria}

---

AGENT A (${agentAName}) RESPONSE:
${agentAResponse}

---

AGENT B (${agentBName}) RESPONSE:
${agentBResponse}

---

Judge these responses and provide your scores as JSON.`;

  const response = await callGroq({
    messages: [{ role: 'user', content: userMessage }],
    systemPrompt,
    temperature: 0.3, // Lower temperature for more consistent judging
    maxTokens: 1024,
  });

  // Parse JSON response
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate scores are numbers between 0-100
    const scoreA = Math.max(0, Math.min(100, Number(result.scoreA) || 0));
    const scoreB = Math.max(0, Math.min(100, Number(result.scoreB) || 0));

    let winnerId: 'A' | 'B' | 'TIE';
    if (scoreA > scoreB) {
      winnerId = 'A';
    } else if (scoreB > scoreA) {
      winnerId = 'B';
    } else {
      winnerId = 'TIE';
    }

    return {
      scoreA,
      scoreB,
      winnerId,
      reasoning: result.reasoning || 'No reasoning provided',
    };
  } catch (parseError) {
    // Fallback: try to extract scores from text
    console.error('Failed to parse judge response as JSON:', parseError);
    console.error('Raw response:', response);

    // Return a default tie if parsing fails
    return {
      scoreA: 50,
      scoreB: 50,
      winnerId: 'TIE',
      reasoning: 'Judge response could not be parsed. Default tie assigned.',
    };
  }
}

// ============================================================================
// MULTI-JUDGE PANEL (Phase 1)
// ============================================================================

/**
 * Individual judge vote — one model's scoring of a match
 */
export interface JudgeVote {
  judgeId: string;
  judgeName: string;
  model: string;
  scoreA: number;
  scoreB: number;
  winnerId: 'A' | 'B' | 'TIE';
  reasoning: string;
  failed: boolean;
}

/**
 * Multi-judge result — aggregated from 3 independent judges
 */
export interface MultiJudgeResult {
  scoreA: number;
  scoreB: number;
  winnerId: 'A' | 'B' | 'TIE';
  reasoning: string;
  judges: JudgeVote[];
  isSplitDecision: boolean;
  isUnanimous: boolean;
}

/**
 * Parse a single judge's JSON response into scores.
 * Returns null if parsing fails entirely.
 */
function parseJudgeResponse(raw: string): { scoreA: number; scoreB: number; reasoning: string } | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    const scoreA = Number(result.scoreA);
    const scoreB = Number(result.scoreB);

    if (isNaN(scoreA) || isNaN(scoreB)) return null;

    return {
      scoreA: Math.max(0, Math.min(100, scoreA)),
      scoreB: Math.max(0, Math.min(100, scoreB)),
      reasoning: result.reasoning || 'No reasoning provided',
    };
  } catch {
    return null;
  }
}

/**
 * Multi-Judge Panel — 3 independent LLMs score a match in parallel.
 *
 * Each judge uses a different model (Llama 70B, Mixtral, Gemma 9B).
 * Final score = weighted average (50% Odin/Llama, 30% Thor/Mixtral, 20% Freya/Gemma).
 * If a judge fails, remaining judges are re-weighted proportionally.
 * If all 3 fail, retries once with Llama 70B only before giving up.
 */
export async function multiJudge(
  challenge: {
    name: string;
    type: string;
    prompt: unknown;
    expectedOutput: unknown;
  },
  agentAName: string,
  agentAResponse: string,
  agentBName: string,
  agentBResponse: string
): Promise<MultiJudgeResult> {
  const judgeSystemPrompt = `You are an impartial AI judge in the Ragnarok arena.
Score each response from 0-100 based on:
- Correctness/accuracy (40%)
- Completeness (30%)
- Clarity and presentation (20%)
- Creativity/elegance (10%)

You MUST respond with ONLY a valid JSON object:
{
  "scoreA": <number 0-100>,
  "scoreB": <number 0-100>,
  "reasoning": "<brief explanation>"
}

No other text outside the JSON.`;

  const prompt = typeof challenge.prompt === 'string'
    ? challenge.prompt
    : JSON.stringify(challenge.prompt);

  const criteria = typeof challenge.expectedOutput === 'string'
    ? challenge.expectedOutput
    : JSON.stringify(challenge.expectedOutput);

  const userMessage = `CHALLENGE: ${challenge.name}
TYPE: ${challenge.type}

PROMPT:
${prompt}

EVALUATION CRITERIA:
${criteria}

---

AGENT A (${agentAName}) RESPONSE:
${agentAResponse}

---

AGENT B (${agentBName}) RESPONSE:
${agentBResponse}

---

Judge these responses and provide your scores as JSON.`;

  // Call all 3 judges in parallel
  const judgePromises = JUDGE_PANEL.map(async (judge): Promise<JudgeVote> => {
    try {
      const raw = await callGroq({
        messages: [{ role: 'user', content: userMessage }],
        systemPrompt: judgeSystemPrompt,
        temperature: 0.3,
        maxTokens: 1024,
        model: judge.model,
      });

      const parsed = parseJudgeResponse(raw);
      if (!parsed) {
        console.error(`[MultiJudge] ${judge.name} (${judge.model}) returned unparseable response`);
        return {
          judgeId: judge.id,
          judgeName: judge.name,
          model: judge.model,
          scoreA: 0,
          scoreB: 0,
          winnerId: 'TIE',
          reasoning: 'Judge response could not be parsed',
          failed: true,
        };
      }

      const winnerId: 'A' | 'B' | 'TIE' =
        parsed.scoreA > parsed.scoreB ? 'A' :
        parsed.scoreB > parsed.scoreA ? 'B' : 'TIE';

      return {
        judgeId: judge.id,
        judgeName: judge.name,
        model: judge.model,
        scoreA: parsed.scoreA,
        scoreB: parsed.scoreB,
        winnerId,
        reasoning: parsed.reasoning,
        failed: false,
      };
    } catch (err) {
      console.error(`[MultiJudge] ${judge.name} (${judge.model}) failed:`, err);
      return {
        judgeId: judge.id,
        judgeName: judge.name,
        model: judge.model,
        scoreA: 0,
        scoreB: 0,
        winnerId: 'TIE',
        reasoning: `Judge error: ${err instanceof Error ? err.message : 'Unknown'}`,
        failed: true,
      };
    }
  });

  const judges = await Promise.all(judgePromises);
  const validJudges = judges.filter(j => !j.failed);

  // If all 3 failed, retry once with primary model
  if (validJudges.length === 0) {
    console.warn('[MultiJudge] All judges failed. Retrying with primary model...');
    try {
      const retryResult = await judgeResponses(
        challenge,
        agentAName,
        agentAResponse,
        agentBName,
        agentBResponse
      );

      // Wrap single-judge result as a multi-judge result
      const fallbackVote: JudgeVote = {
        judgeId: 'odin',
        judgeName: 'ODIN (retry)',
        model: GROQ_MODEL,
        scoreA: retryResult.scoreA,
        scoreB: retryResult.scoreB,
        winnerId: retryResult.winnerId,
        reasoning: retryResult.reasoning,
        failed: false,
      };

      return {
        scoreA: retryResult.scoreA,
        scoreB: retryResult.scoreB,
        winnerId: retryResult.winnerId,
        reasoning: retryResult.reasoning,
        judges: [fallbackVote, ...judges.filter(j => j.failed)],
        isSplitDecision: false,
        isUnanimous: false, // Single fallback judge — not a true unanimous decision
      };
    } catch {
      // Total failure — this should trigger a refund in the caller
      throw new Error('All judges failed to score this battle. Match should be refunded.');
    }
  }

  // Calculate weighted average from valid judges
  // Re-weight proportionally if some judges failed
  const totalWeight = validJudges.reduce((sum, j) => {
    const config = JUDGE_PANEL.find(p => p.id === j.judgeId)!;
    return sum + config.weight;
  }, 0);

  let weightedScoreA = 0;
  let weightedScoreB = 0;
  const reasonings: string[] = [];

  for (const judge of validJudges) {
    const config = JUDGE_PANEL.find(p => p.id === judge.judgeId)!;
    const normalizedWeight = config.weight / totalWeight;
    weightedScoreA += judge.scoreA * normalizedWeight;
    weightedScoreB += judge.scoreB * normalizedWeight;
    reasonings.push(`${judge.judgeName}: ${judge.reasoning}`);
  }

  const scoreA = Math.round(weightedScoreA);
  const scoreB = Math.round(weightedScoreB);

  // Check for split decision (judges disagree on winner)
  const winnerVotes = validJudges.map(j => j.winnerId);
  const uniqueVotes = new Set(winnerVotes);
  const isSplitDecision = uniqueVotes.size > 1;
  const isUnanimous = uniqueVotes.size === 1 && validJudges.length >= 2;

  // Determine winner: weighted scores first, majority vote as tiebreaker
  let winnerId: 'A' | 'B' | 'TIE';
  if (scoreA > scoreB) {
    winnerId = 'A';
  } else if (scoreB > scoreA) {
    winnerId = 'B';
  } else {
    // Scores tied — use majority vote as tiebreaker
    const votesA = winnerVotes.filter(v => v === 'A').length;
    const votesB = winnerVotes.filter(v => v === 'B').length;
    winnerId = votesA > votesB ? 'A' : votesB > votesA ? 'B' : 'TIE';
  }

  const decisionType = isUnanimous ? 'UNANIMOUS' : isSplitDecision ? 'SPLIT DECISION' : 'MAJORITY';

  return {
    scoreA,
    scoreB,
    winnerId,
    reasoning: `[${decisionType}] ${reasonings.join(' | ')}`,
    judges,
    isSplitDecision,
    isUnanimous,
  };
}

// ============================================================================
// BATCH SCORING (Battle Royale)
// ============================================================================

/**
 * Score multiple agent responses to a single challenge in one judge call.
 * Used by Battle Royale to efficiently score all participants per round.
 */
export interface BatchScoreResult {
  agentName: string;
  score: number;
  reasoning: string;
}

export async function scoreBatchResponses(
  challenge: {
    name: string;
    type: string;
    prompt: unknown;
    expectedOutput: unknown;
  },
  responses: Array<{ agentName: string; response: string }>
): Promise<BatchScoreResult[]> {
  const systemPrompt = `You are the ALLFATHER JUDGE of Ragnarok, scoring battle responses.
Score EACH response independently from 0-100 based on:
- Correctness/accuracy (40%)
- Completeness (30%)
- Clarity and presentation (20%)
- Creativity/elegance (10%)

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "scores": [
    { "agent": "<agent name>", "score": <number 0-100>, "reasoning": "<brief>" }
  ]
}

Do not include any other text, markdown, or explanation outside the JSON.`;

  const prompt = typeof challenge.prompt === 'string'
    ? challenge.prompt
    : JSON.stringify(challenge.prompt);

  const criteria = typeof challenge.expectedOutput === 'string'
    ? challenge.expectedOutput
    : JSON.stringify(challenge.expectedOutput);

  const responsesText = responses
    .map((r, i) => `--- AGENT ${i + 1}: ${r.agentName} ---\n${r.response}`)
    .join('\n\n');

  const userMessage = `CHALLENGE: ${challenge.name}
TYPE: ${challenge.type}

PROMPT:
${prompt}

EVALUATION CRITERIA:
${criteria}

${responsesText}

---

Score each agent's response independently. Return JSON with scores array.`;

  const result = await callGroq({
    messages: [{ role: 'user', content: userMessage }],
    systemPrompt,
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    const scores: BatchScoreResult[] = [];

    if (Array.isArray(parsed.scores)) {
      for (const entry of parsed.scores) {
        const agentName = entry.agent || entry.agentName || 'Unknown';
        const matchedResponse = responses.find(
          r => r.agentName.toLowerCase() === agentName.toLowerCase()
        );
        scores.push({
          agentName: matchedResponse?.agentName || agentName,
          score: Math.max(0, Math.min(100, Number(entry.score) || 0)),
          reasoning: entry.reasoning || 'No reasoning provided',
        });
      }
    }

    // If judge returned fewer scores than responses, fill with defaults
    for (const r of responses) {
      if (!scores.find(s => s.agentName === r.agentName)) {
        scores.push({ agentName: r.agentName, score: 50, reasoning: 'Score not returned by judge.' });
      }
    }

    return scores;
  } catch {
    // Fallback: give everyone 50
    return responses.map(r => ({
      agentName: r.agentName,
      score: 50,
      reasoning: 'Judge response could not be parsed.',
    }));
  }
}

/**
 * Calculate ELO rating changes
 */
export function calculateEloChange(
  winnerRating: number,
  loserRating: number,
  kFactor: number = 32
): { winnerDelta: number; loserDelta: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerDelta = Math.round(kFactor * (1 - expectedWinner));
  const loserDelta = Math.round(kFactor * (0 - expectedLoser));

  return { winnerDelta, loserDelta };
}
