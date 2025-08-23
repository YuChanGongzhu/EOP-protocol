/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(76, 61, 255, 0.08) 1px, transparent 1px), 
                         linear-gradient(90deg, rgba(76, 61, 255, 0.08) 1px, transparent 1px)`,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'card-float': 'cardFloat 8s infinite ease-in-out',
        'pulse': 'pulse 2s infinite ease-in-out',
        'background-pulse': 'backgroundPulse 8s infinite ease-in-out',
        'grid-move': 'gridMove 50s infinite linear',
        'badge-breath': 'badgeBreath 3s infinite ease-in-out',
        'badge-shimmer': 'badgeShimmer 4s infinite',
      },
      keyframes: {
        cardFloat: {
          '0%, 100%': { transform: 'scale(1.25) translateY(0)' },
          '50%': { transform: 'scale(1.25) translateY(-10px)' },
        },
        pulse: {
          '0%, 100%': { 
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: '0.3'
          },
          '50%': { 
            transform: 'translate(-50%, -50%) scale(1.2)',
            opacity: '0.5'
          },
        },
        backgroundPulse: {
          '0%, 100%': { 
            opacity: '0.5',
            transform: 'translate(-50%, -50%) scale(1)'
          },
          '50%': { 
            opacity: '0.8',
            transform: 'translate(-50%, -50%) scale(1.2)'
          },
        },
        gridMove: {
          '0%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(60px, 60px) rotate(0.5deg)' },
          '100%': { transform: 'translate(120px, 120px) rotate(0deg)' },
        },
        badgeBreath: {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)'
          },
          '50%': { 
            transform: 'scale(1.05)',
            boxShadow: '0 6px 24px rgba(239, 68, 68, 0.3)'
          },
        },
        badgeShimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
      },
      transformStyle: {
        '3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      rotate: {
        'y-180': 'rotateY(180deg)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.transform-style-3d': {
          'transform-style': 'preserve-3d',
        },
        '.perspective-1000': {
          'perspective': '1000px',
        },
        '.auto-flip .pass-card-inner': {
          'transform': 'rotateY(180deg)',
        },
      };
      addUtilities(newUtilities);
    },
  ],
}
