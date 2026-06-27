import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".codex-node_modules/**",
      "node_modules/**",
      "coverage/**",
      "outputs/**",
      "work/**",
      "prisma/dev.db",
      "prisma/*.db"
    ]
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
