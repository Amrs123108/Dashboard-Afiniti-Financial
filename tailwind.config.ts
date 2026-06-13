import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Branding Affinity — los valores reales viven en CSS vars (globals.css)
        affinity: {
          primary: "var(--affinity-primary)",
          dark: "var(--affinity-primary-dark)",
          light: "var(--affinity-primary-light)",
          accent: "var(--affinity-accent)",
          bg: "var(--affinity-bg)",
        },
        semaforo: {
          verde: "var(--semaforo-verde)",
          amarillo: "var(--semaforo-amarillo)",
          rojo: "var(--semaforo-rojo)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
