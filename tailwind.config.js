/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Surface / background hierarchy ---
        surface: {
          base:   '#0b1220',   // page background
          card:   '#111827',   // card / panel background
          elevated: '#1a2332', // header, table header
          border: '#273245',   // subtle borders
          hover:  '#1f2a3d',   // row hover
        },
        // --- Text ---
        ink: {
          primary:   '#f1f5f9', // headings, primary text
          secondary: '#94a3b8', // labels, subtitles
          muted:     '#64748b', // timestamps, metadata
        },
        // --- Accent (brand) ---
        brand: {
          DEFAULT:   '#4f46e5', // indigo - primary actions, active nav, logos
          hover:     '#4338ca', // darker on hover
          soft:      '#6366f1', // indigo-400 - wallet address, links
        },
        // --- Semantic status surfaces ---
        ok: {
          DEFAULT:   '#10b981',
          soft:      'rgba(16,185,129,0.15)',
          border:    'rgba(16,185,129,0.45)',
          text:      '#6ee7b7',
        },
        warn: {
          DEFAULT:   '#f59e0b',
          soft:      'rgba(245,158,11,0.15)',
          border:    'rgba(245,158,11,0.45)',
          text:      '#fcd34d',
        },
        danger: {
          DEFAULT:   '#ef4444',
          soft:      'rgba(239,68,68,0.15)',
          border:    'rgba(239,68,68,0.45)',
          text:      '#fca5a5',
        },
        neutral: {
          DEFAULT:   '#64748b',
          soft:      'rgba(100,116,139,0.18)',
          border:    'rgba(100,116,139,0.4)',
          text:      '#cbd5e1',
        },
      },
    },
  },
  plugins: [],
}
