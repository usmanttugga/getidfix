import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'border-[#0D2137]/10',
    'border-[#0D2137]/15',
    'border-[#0D2137]/20',
    'border-[#0D2137]/30',
    'border-[#0D2137]/40',
    'bg-[#0D2137]/5',
    'bg-[#0D2137]/8',
    'bg-[#0D2137]/10',
    'bg-[#0D2137]/15',
    'bg-[#0D2137]/20',
    'hover:bg-[#0D2137]/5',
    'hover:bg-[#0D2137]/8',
    'hover:bg-[#0D2137]/10',
    'hover:bg-[#0D2137]/15',
    'hover:border-[#0D2137]/30',
    'hover:border-[#0D2137]/40',
    'divide-[#0D2137]/8',
    'divide-[#0D2137]/10',
    'text-[#0D2137]',
    'text-[#C9A84C]',
    'bg-[#C9A84C]',
    'border-[#0D2137]',
    'bg-[#0D2137]',
    'hover:bg-[#0f2d4a]',
    'focus:ring-[#0D2137]/40',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D2137',
        accent: '#C9A84C',
        danger: '#C0392B',
        warning: '#B7770D',
        background: '#EEF1F6',
        surface: '#FFFFFF',
        'text-primary': '#0D1B2A',
        'text-secondary': '#5A6A7A',
      },
      borderRadius: {
        card: '8px',
        input: '6px',
        badge: '4px',
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['Inter', 'var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
