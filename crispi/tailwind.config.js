/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1677ff',
          dark: '#0958d9',
        },
      },
    },
  },
  plugins: [],
}



