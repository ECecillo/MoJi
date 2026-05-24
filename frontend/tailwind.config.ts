import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette volontairement sobre : noir / blanc / quelques gris.
        // L'écran cible (Boox Air 5c) est e-ink couleur mais privilégie un rendu monochrome stable.
        ink: {
          DEFAULT: '#111111',
          muted: '#444444',
          faint: '#888888',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          muted: '#F4F4F4',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        hanzi: ['"Noto Serif SC"', '"Songti SC"', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
