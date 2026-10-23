/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./popup.html",
    "./options.html",
    "./warning.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#09090D',
          surface: '#13131A',
          elevated: '#1B1B25',
          border: '#2A2430'
        },
        crimson: {
          DEFAULT: '#E11D48',
          accent: '#FB7185',
          glow: '#5A081A',
          container: '#2D0A14'
        },
        cyber: {
          blue: '#38BDF8',
          container: '#0C263B'
        },
        emerald: {
          safe: '#10B981',
          container: '#082E24'
        },
        amber: {
          warning: '#F59E0B',
          container: '#332107'
        }
      }
    }
  },
  plugins: []
};
