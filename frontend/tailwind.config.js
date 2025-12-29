module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
        heading: ['Manrope', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        border: 'hsl(214.3 31.8% 91.4%)',
        input: 'hsl(214.3 31.8% 91.4%)',
        ring: 'hsl(142 76% 36%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 84% 4.9%)',
        primary: {
          DEFAULT: 'hsl(142 76% 36%)',
          foreground: 'hsl(210 40% 98%)'
        },
        secondary: {
          DEFAULT: 'hsl(48 100% 50%)',
          foreground: 'hsl(222.2 47.4% 11.2%)'
        },
        accent: {
          DEFAULT: 'hsl(0 84% 60%)',
          foreground: 'hsl(210 40% 98%)'
        },
        destructive: {
          DEFAULT: 'hsl(0 84.2% 60.2%)',
          foreground: 'hsl(210 40% 98%)'
        },
        muted: {
          DEFAULT: 'hsl(210 40% 96.1%)',
          foreground: 'hsl(215.4 16.3% 46.9%)'
        },
        popover: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(222.2 84% 4.9%)'
        },
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(222.2 84% 4.9%)'
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};