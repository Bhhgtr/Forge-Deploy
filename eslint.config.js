import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import security from "eslint-plugin-security";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import boundaries from "eslint-plugin-boundaries";

export default [
  {
    ignores: [
      "node_modules",
      "dist",
      "incidents",
      "incident-reports",
      "dashboards",
      "documentation",
    ],
  },

  js.configs.recommended,
  prettierConfig,

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      security,
      prettier: prettierPlugin,
      boundaries,
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: ["decisions"],
              allow: ["slo", "observability"],
            },
            {
              from: ["actions"],
              allow: ["incidents"],
            },
          ],
        },
      ],

      "prettier/prettier": "error",

      "no-console": "off",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",

      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-unsafe-regex": "warn",
    },
  },
];
