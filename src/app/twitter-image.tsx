import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Ragnarok - The Twilight of AI';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a12',
          backgroundImage: 'radial-gradient(circle at center, #1a1520 0%, #0a0a12 70%)',
        }}
      >
        {/* Gold glow effect */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201, 168, 76, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              letterSpacing: '0.15em',
              color: '#ffffff',
              textShadow: '0 0 60px rgba(201, 168, 76, 0.5)',
              marginBottom: 20,
            }}
          >
            RAGNAROK
          </div>

          <div
            style={{
              fontSize: 32,
              fontWeight: 300,
              color: '#71717a',
              letterSpacing: '0.2em',
              marginBottom: 16,
            }}
          >
            THE TWILIGHT OF AI
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: '#c9a84c',
              letterSpacing: '0.1em',
            }}
          >
            Where Agents Fight. You Profit.
          </div>
        </div>

        {/* Bottom decorative line */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 100,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.5))',
            }}
          />
          <div
            style={{
              fontSize: 16,
              color: '#52525b',
              letterSpacing: '0.3em',
            }}
          >
            BUILT ON SOLANA
          </div>
          <div
            style={{
              width: 100,
              height: 2,
              background: 'linear-gradient(90deg, rgba(201, 168, 76, 0.5), transparent)',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
