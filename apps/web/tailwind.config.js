/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          50: '#f3f0ff',
          100: '#ece7ff',
          200: '#ddd4ff',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7C5CFC',
          700: '#6d4ef0',
          800: '#5a3fd6',
          900: '#4a32b0',
          foreground: 'var(--text-on-primary)',
          ring: 'rgba(124, 92, 252, 0.35)',
          subtle: 'rgba(124, 92, 252, 0.10)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          hover: 'var(--border-hover)',
          focus: 'var(--border-focus)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        ring: 'var(--ring)',
        input: 'var(--input)',
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        status: {
          success: '#3FB950',
          warning: '#D29922',
          error: '#EF4444',
          info: '#3B82F6',
        },
        priority: {
          high: '#EF4444',
          medium: '#F59E0B',
          low: '#3B82F6',
          urgent: '#DC2626',
        },
        project: {
          indigo: '#4F46E5',
          teal: '#0D9488',
          amber: '#D97706',
          rose: '#BE123C',
          emerald: '#059669',
          violet: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Geist Variable', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '250ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(76, 29, 149, 0.05), 0 2px 4px rgba(76, 29, 149, 0.04)',
        md: '0 1px 2px rgba(76, 29, 149, 0.05), 0 4px 8px rgba(76, 29, 149, 0.06)',
        lg: '0 1px 2px rgba(76, 29, 149, 0.05), 0 8px 16px rgba(76, 29, 149, 0.08)',
        glow: '0 0 40px rgba(124, 92, 252, 0.14)',
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '20px',
        'space-6': '24px',
        'space-8': '32px',
        'space-10': '40px',
        'space-12': '48px',
        'space-16': '64px',
        'space-20': '80px',
      },
    },
  },
  plugins: [],
}
