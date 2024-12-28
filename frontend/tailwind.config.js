/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}', // Matches all JS/TS/JSX/TSX files in the app directory
    './pages/**/*.{js,jsx,ts,tsx}', // Matches all JS/TS/JSX/TSX files in the pages directory
    './components/**/*.{js,jsx,ts,tsx}', // Matches all JS/TS/JSX/TSX files in the components directory
    './public/**/*.html', // Matches all HTML files in the public directory
    './node_modules/@shadcn/ui/**/*.js', // Includes Shadcn UI components
  ],
  theme: {
    extend: {
      // Extend default theme settings here
    },
  },
  plugins: [
    // Add Tailwind CSS plugins here, e.g., forms or typography
  ],
};
