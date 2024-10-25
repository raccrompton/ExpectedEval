/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        backdrop: 'var(--color-backdrop)',
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        button: {
          primary: 'var(--color-button-primary)',
          secondary: 'var(--color-button-secondary)',
        },
        background: {
          1: 'var(--color-background1)',
          2: 'var(--color-background2)',
          3: 'var(--color-background3)',
          4: 'var(--color-background4)',
          5: 'var(--color-background5)',
        },
        human: {
          1: 'var(--color-human-accent1)',
          2: 'var(--color-human-accent2)',
          3: 'var(--color-human-accent3)',
          4: 'var(--color-human-accent4)',
        },
        engine: {
          1: 'var(--color-engine-accent1)',
          2: 'var(--color-engine-accent2)',
          3: 'var(--color-engine-accent3)',
          4: 'var(--color-engine-accent4)',
        },
      },
    },
  },
  plugins: [],
}
