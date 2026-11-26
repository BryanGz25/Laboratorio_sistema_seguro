/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Único acento permitido: azul corporativo (máximo 10% de la interfaz).
        accent: {
          DEFAULT: '#2563eb',
          hover: '#3b82f6',
          soft: '#60a5fa',
        },
      },
      backdropBlur: { glass: '12px' },
    },
  },
  plugins: [],
};
