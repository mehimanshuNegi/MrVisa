/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B2A63',
          blue: '#1479F5',
          lightBlue: '#F3F8FF',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'page': '1450px',
      },
      borderRadius: {
        'card': '26px',
      },
      scale: {
        '104': '1.04',
      },
      boxShadow: {
        'subtle': '0 2px 8px -2px rgba(11, 42, 99, 0.05)',
        'premium': '0 12px 32px -4px rgba(11, 42, 99, 0.08)',
        'floating': '0 20px 45px -10px rgba(11, 42, 99, 0.12)',
      }
    },
  },
  plugins: [],
}
