/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          secondary: "hsl(var(--brand-secondary))",
          foreground: "hsl(var(--brand-foreground))",
          muted: "hsl(var(--brand-muted))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        "surface-dark": {
          DEFAULT: "hsl(var(--surface-dark))",
          foreground: "hsl(var(--surface-dark-foreground))",
          border: "hsl(var(--surface-dark-border))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",                    // 12px
        md: "calc(var(--radius) - 2px)",        // 10px
        sm: "calc(var(--radius) - 4px)",        // 8px
        xl: "1rem",                             // 16px
        "2xl": "1.25rem",                       // 20px
        pill: "100px",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
      },
      fontSize: {
        // Design token: Display size for Hero headings
        'display': ['clamp(3rem, 5vw + 1rem, 5rem)', {
          lineHeight: '0.9',
          letterSpacing: '-0.03em',
          fontWeight: '600',
        }],
      },
      letterSpacing: {
        editorial: '-0.02em',
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        spotlight: {
          "0%": {
            opacity: 0,
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: 1,
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        marquee2: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        /* fade-up, scale-in, slide-in-right, slide-in-left:
         * 这些动画已在 globals.css 中定义（使用 CSS custom property --animation-delay），
         * 从 Tailwind config 中移除以避免重复定义导致的 hydration mismatch。
         * 参见 globals.css 中的 .animate-fade-up 等类。
         */
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(80px) rotate(720deg)", opacity: "0" },
        },
        "celebrate-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "card-enter": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "nav-progress": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(0.8)" },
        },
        "nav-complete": {
          "0%": { transform: "scaleX(0.8)", opacity: "1" },
          "50%": { transform: "scaleX(1)", opacity: "1" },
          "100%": { transform: "scaleX(1)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spotlight: "spotlight 2s ease .75s 1 forwards",
        marquee: "marquee 25s linear infinite",
        marquee2: "marquee2 25s linear infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-down": "fade-down 0.4s ease-out",
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
        "confetti-fall": "confetti-fall 1.2s ease-out forwards",
        "celebrate-pop": "celebrate-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "card-enter": "card-enter 0.4s ease-out",
        "nav-progress": "nav-progress 8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "nav-complete": "nav-complete 0.3s ease-out forwards",
      },
      transitionDuration: {
        DEFAULT: "200ms",
        '250': '250ms',
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        'sidebar': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // eslint-disable-line @typescript-eslint/no-require-imports
};
