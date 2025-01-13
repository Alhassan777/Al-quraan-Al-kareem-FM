/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html', // Vite's entry point
    './src/**/*.{js,jsx,ts,tsx}', // Scans all JS/TS/JSX/TSX files in the src directory
    './node_modules/@shadcn/ui/**/*.js', // Includes Shadcn UI components
  ],
  theme: {
    extend: {
      // Extend default theme settings here
    },
  },
  plugins: [
    // Add Tailwind CSS plugins here, e.g., forms or typography
    // Example:
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};
