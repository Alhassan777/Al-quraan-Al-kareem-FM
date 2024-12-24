module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}', // Include all files in app folder
    './pages/**/*.{js,jsx,ts,tsx}', // Include files in pages folder if present
    './components/**/*.{js,jsx,ts,tsx}', // Include components folder
    './public/**/*.html', // Include static HTML files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
