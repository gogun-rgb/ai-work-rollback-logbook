import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#1f2933",
          700: "#374151",
          500: "#667085"
        }
      }
    }
  },
  plugins: []
};

export default config;
