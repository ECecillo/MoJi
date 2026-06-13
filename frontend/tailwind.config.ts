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
          // #6F6F6F ≈ 5:1 sur blanc : franchit le seuil AA (4.5:1) pour le petit
          // texte, contrairement à l'ancien #888888 (3.54:1) signalé par Lighthouse.
          faint: '#6F6F6F',
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
