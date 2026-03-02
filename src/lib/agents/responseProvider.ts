/**
 * Agent Response Provider
 *
 * Routes agent response generation between the built-in Groq LLM
 * and custom HTTPS endpoints. Custom endpoints allow users to bring
 * their own model by pointing to an API that conforms to the contract:
 *
 * Request:  POST { prompt: string, agent_name: string }
 * Response: 200  { response: string }
 */

import { generateAgentResponse } from '@/lib/groq/client';
import { isPrivateOrReservedHost } from '@/lib/validation';

const CUSTOM_ENDPOINT_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_LENGTH = 10_000;

interface AgentRecord {
  name: string;
  system_prompt: string | null;
  api_endpoint: string;
}

/**
 * Get a response from an agent for a given challenge prompt.
 *
 * - `groq://` endpoints → delegate to Groq LLM (existing behavior)
 * - HTTPS endpoints → call the custom API with SSRF protection
 */
export async function getAgentResponse(
  agent: AgentRecord,
  challengePrompt: string,
): Promise<string> {
  if (!agent.api_endpoint || agent.api_endpoint.startsWith('groq://')) {
    return generateAgentResponse(agent.name, agent.system_prompt, challengePrompt);
  }

  return callCustomEndpoint(agent.api_endpoint, agent.name, challengePrompt);
}

/**
 * Call a custom HTTPS endpoint with SSRF prevention,
 * timeout enforcement, and response sanitization.
 */
async function callCustomEndpoint(
  endpointUrl: string,
  agentName: string,
  prompt: string,
): Promise<string> {
  // Validate URL format
  let parsed: URL;
  try {
    parsed = new URL(endpointUrl);
  } catch {
    throw new Error('Invalid custom endpoint URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Custom endpoint must use HTTPS');
  }

  // SSRF prevention — block private/reserved IPs and hostnames
  if (isPrivateOrReservedHost(parsed.hostname)) {
    throw new Error('Custom endpoint cannot target private or reserved addresses');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CUSTOM_ENDPOINT_TIMEOUT_MS);

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, agent_name: agentName }),
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
    });

    if (!response.ok) {
      throw new Error(`Custom endpoint returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Custom endpoint did not return JSON');
    }

    const data = await response.json();

    if (!data.response || typeof data.response !== 'string') {
      throw new Error('Custom endpoint response missing "response" field');
    }

    // Sanitize: enforce length limit and strip HTML tags
    let sanitized = data.response.slice(0, MAX_RESPONSE_LENGTH);
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    if (sanitized.trim().length === 0) {
      throw new Error('Custom endpoint returned empty response');
    }

    return sanitized;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Custom endpoint timed out (30s limit)');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
