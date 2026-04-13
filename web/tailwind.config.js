

const applyCustomColors = (theme, front, back) => {
  return {
    ...require("daisyui/src/theming/themes")[`[data-theme=${theme}]`],
    "--front": front,
    "--back": back || `${front} /0.75`,
  };
};

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  plugins: [require('daisyui'), require("@tailwindcss/typography")],
  theme: {
    extend: {
      colors: {
        "front": "hsl(var(--front, 0deg 0% 60% / 10%))",
        "back": "hsl(var(--back, 212 14% 10% / 1))",
      },
    },
  },
  daisyui: {
    themes: [
      {
        cybermetrik: {
          "primary": "#00aeef",     // Azul Cyan (Brand Primary)
          "secondary": "#632d88",   // Morado (Brand Secondary)
          "accent": "#f58220",      // Naranja (Highlights)
          "neutral": "#1f2937",     // Dark Gray (Standard for legibility, using Brand 'Gris' #8E8E93 for UI elements if needed)
          "base-100": "#ffffff",    // White clean background
          "info": "#6875F5",        // Índigo Jetstream
          "success": "#36d399",     // Standard Green (Checklist needs this)
          "warning": "#e07018",     // Naranja Oscuro (Warning text)
          "error": "#FF2D20",       // Rojo (Error state)
          ...require("daisyui/src/theming/themes")["[data-theme=light]"],
          "--front": "0 0% 0%",      // Foreground text color
          "--back": "200 100% 95%"   // Background tint
        },
      },
      { light: applyCustomColors("light", "237 9% 86% / 0.75", "237 9% 86% / 1") },
      { dark: applyCustomColors("dark", "217 14% 17%", "212 14% 10%") },
      { night: applyCustomColors("night", "220deg 44.68% 9.22%", "219.2, 38.2%, 13.3%") },
    ],
  },
  safelist: [
    { // TODO: This adds a lot of overhead. Go through code, and remove any un-needed variants.
      pattern: /(bg|outline|text|tw-color|border)-(yellow|lime|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|red)-(200|300|400|500|600)/,
      variants: ['light', 'dark', 'hover', 'focus'],
    },
    {
      pattern: /(badge|bg|checkbox|toggle)-(success|warning|error|info|neutral)/,
      variants: ['light', 'dark', 'hover', 'focus', 'checked'],
    }
  ],
};
