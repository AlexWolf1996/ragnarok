import { NextRequest, NextResponse } from 'next/server';
import { agentEndpointUrlSchema, isPrivateOrReservedHost } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 checks per IP per minute
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`verify-endpoint:${ip}`, 3);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again in a minute.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { endpoint_url } = body;

    if (!endpoint_url || typeof endpoint_url !== 'string') {
      return NextResponse.json(
        { error: 'endpoint_url is required' },
        { status: 400 },
      );
    }

    // Validate URL format and SSRF
    const urlValidation = agentEndpointUrlSchema.safeParse(endpoint_url);
    if (!urlValidation.success) {
      const msg = urlValidation.error.errors[0]?.message || 'Invalid URL';
      return NextResponse.json(
        { success: false, error: msg },
        { status: 400 },
      );
    }

    // Double-check SSRF at runtime (belt + suspenders)
    const parsed = new URL(endpoint_url);
    if (isPrivateOrReservedHost(parsed.hostname)) {
      return NextResponse.json(
        { success: false, error: 'URL must not target private or reserved addresses' },
        { status: 400 },
      );
    }

    // Send a test request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const start = Date.now();

    try {
      const response = await fetch(endpoint_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Health check: respond with a short greeting.',
          agent_name: '__health_check__',
        }),
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
      });

      const latency_ms = Date.now() - start;

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          latency_ms,
          error: `Endpoint returned HTTP ${response.status}`,
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return NextResponse.json({
          success: false,
          latency_ms,
          error: 'Endpoint must return Content-Type: application/json',
        });
      }

      const data = await response.json();

      if (!data.response || typeof data.response !== 'string') {
        return NextResponse.json({
          success: false,
          latency_ms,
          error: 'Response must include a "response" string field',
        });
      }

      return NextResponse.json({
        success: true,
        latency_ms,
      });
    } catch (fetchError) {
      const latency_ms = Date.now() - start;

      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          latency_ms,
          error: 'Endpoint timed out (10s limit)',
        });
      }

      return NextResponse.json({
        success: false,
        latency_ms,
        error: 'Failed to connect to endpoint',
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 },
    );
  }
}
