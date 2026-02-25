/**
 * Groq API Client for Ragnarok Battle Execution
 * Uses OpenAI-compatible API format with Llama 3.3 70B
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

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

  const { messages, temperature = 0.7, maxTokens = 2048, systemPrompt } = options;

  // Prepend system prompt if provided
  const allMessages: GroqMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  let response: Response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: allMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
  } catch (fetchError) {
    throw new Error(`Failed to connect to Groq API: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
  }

  // Read response body as text first to handle non-JSON responses
  const responseText = await response.text();

  if (!response.ok) {
    // Check if it's HTML (common when API key is invalid or URL is wrong)
    if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
      throw new Error(`Groq API returned HTML instead of JSON (status ${response.status}). This usually means the API key is invalid or missing.`);
    }
    throw new Error(`Groq API error (${response.status}): ${responseText}`);
  }

  // Parse JSON response
  let data: GroqResponse;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    // Response is not valid JSON
    const preview = responseText.substring(0, 100);
    throw new Error(`Groq API returned invalid JSON. Response preview: ${preview}...`);
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from Groq API');
  }

  return data.choices[0].message.content;
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
    maxTokens: 2048,
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
