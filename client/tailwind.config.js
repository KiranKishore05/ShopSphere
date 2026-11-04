/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sphere: {
          ivory: '#FDFBF7',
          surface: '#FFFFFF',
          cream: '#F7F4EC',
          border: '#EAE5DA',
          ink: '#161513',
          charcoal: '#4B4843',
          muted: '#827E77',
          sand: {
            DEFAULT: '#C8B293',
            light: '#E6D7C3',
            dark: '#9E8462'
          },
          sage: {
            DEFAULT: '#788A75',
            light: '#A3B3A0',
            dark: '#4F604D'
          },
          status: {
            error: '#BA4343',
            success: '#3D7853',
            warning: '#C78828'
          }
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '12px',
      },
      boxShadow: {
        'editorial-sm': '0 1px 3px rgba(22, 21, 19, 0.05)',
        'editorial-md': '0 4px 12px rgba(22, 21, 19, 0.08)',
        'editorial-lg': '0 12px 32px rgba(22, 21, 19, 0.12)',
      },
      letterSpacing: {
        'luxury': '0.12em',
      }
    },
  },
  plugins: [],
}
