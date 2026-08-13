/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      'none': '0px',
      'xs': '4px',
      'sm': '4px',
      'DEFAULT': '4px',
      'md': '6px',
      'lg': '6px',
      'xl': '6px',
      '2xl': '6px',
      '3xl': '6px',
      'full': '9999px',
    },
    extend: {
      borderColor: {
        DEFAULT: "hsl(var(--border))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
          550: '#5956eb',
          605: '#4c44e0',
          650: '#493fd7',
          750: '#3d34b7',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        emerald: {
          650: '#048760',
        },
        amber: {
          650: '#c66508',
        },
        purple: {
          650: '#882bdc',
        },
        slate: {
          450: '#7c8ba2',
          850: '#162032',
        },
        blue: {
          105: '#d3e5fe',
        },
      },
      accentColor: {
        primary: "hsl(var(--primary))",
      },
      width: {
        '8.5': '2.125rem',
        '6.5': '1.625rem',
        '4.5': '1.125rem',
      },
      height: {
        '8.5': '2.125rem',
        '6.5': '1.625rem',
        '4.5': '1.125rem',
      },
    },
  },
  plugins: [],
}
