import globals from "globals";
import js from "@eslint/js";
import typescriptEslintParser from "@typescript-eslint/parser";
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      "dist/",
      "node_modules/",
      "vite.config.ts",
      "*.cjs",
      "*.mjs",
      "eslint.config.js",
      "src/assets/**",
      "src/styles/**",
      "public/**",
    ],
  },

  // Base configuration for JavaScript and TypeScript files
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    ...js.configs.recommended,
    languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module", // Default to module, will be overridden for specific scripts
        globals: {
            ...globals.es2021,
        }
    },
    rules: {
        'no-console': 'warn', // Default console rule
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    }
  },

  // Configuration for most root-level JavaScript utility/script files
  {
    files: ["*.js"], // Targets JS files directly in the root
    languageOptions: {
      sourceType: "script", // Assume most are scripts, not ES modules
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Configuration for specific root-level JavaScript files that ARE ES modules
  {
    files: [
        "complete-fix-validation.js",
        "comprehensive-fix.js",
        "console-error-fix-validation.js",
        "test-server.js"
        // Add any other root JS files that are modules here
    ],
    languageOptions: {
      sourceType: "module", // These specific files are ES modules
      globals: { // They might still need node/browser globals
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'off', // Keep console off for these test/validation scripts
      // Ensure import/export rules from js.configs.recommended are not overly restrictive if issues arise
    },
  },

  // TypeScript specific configurations
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
    },
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...(typescriptEslintPlugin.configs.recommended.rules),
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // no-console for TS files will be 'warn' as inherited from the base JS/TS config
    },
  },

  // Configuration for specific JavaScript files like Netlify functions
  {
    files: ["netlify/functions/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        event: "readonly",
        context: "readonly",
      },
    },
    rules: {
      // no-console for these files will be 'warn' as inherited from base.
      // If 'off' is desired: 'no-console': 'off',
    },
  },
];
