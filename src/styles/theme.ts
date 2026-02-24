// Norse Theme Color Constants
export const theme = {
  colors: {
    // Backgrounds
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgTertiary: '#1a1a25',

    // Fire palette
    fireRed: '#c41e3a',
    emberOrange: '#e8590c',
    fireYellow: '#ffa500',

    // Ice palette
    frostBlue: '#4fc3f7',
    paleCyan: '#b3e5fc',
    iceWhite: '#e0f7fa',

    // Accents
    gold: '#d4a843',
    goldLight: '#f0d78c',
    goldDark: '#a88734',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    textMuted: '#666666',
  },

  gradients: {
    fire: 'linear-gradient(135deg, #c41e3a 0%, #e8590c 50%, #ffa500 100%)',
    ice: 'linear-gradient(135deg, #4fc3f7 0%, #b3e5fc 50%, #e0f7fa 100%)',
    fireIce: 'linear-gradient(135deg, #c41e3a 0%, #e8590c 25%, #4fc3f7 75%, #b3e5fc 100%)',
    gold: 'linear-gradient(135deg, #a88734 0%, #d4a843 50%, #f0d78c 100%)',
    darkFade: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
  },

  shadows: {
    fire: '0 0 20px rgba(196, 30, 58, 0.5), 0 0 40px rgba(232, 89, 12, 0.3)',
    ice: '0 0 20px rgba(79, 195, 247, 0.5), 0 0 40px rgba(179, 229, 252, 0.3)',
    gold: '0 0 20px rgba(212, 168, 67, 0.5)',
  },
} as const;

export type Theme = typeof theme;
