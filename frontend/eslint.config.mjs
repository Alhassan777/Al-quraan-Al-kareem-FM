import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize FlatCompat for older-style configurations
const compat = new FlatCompat({
  baseDirectory: __dirname, // Base directory for resolving plugins and configs
});

// Define the ESLint configuration
const eslintConfig = [
  ...compat.extends("next/core-web-vitals"), // Extend Next.js rules
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"], // Files to apply linting
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021, // ECMAScript version
        sourceType: "module", // ES Modules
      },
    },
    rules: {
      // Add custom rules or overrides here
    },
  },
];

export default eslintConfig;
