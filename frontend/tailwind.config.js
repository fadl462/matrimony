/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // A warm, jewel-toned palette meant to read as "matrimony/celebration"
        // across the cultural contexts the seed data spans (Ghana + India),
        // deliberately steering away from the cream+terracotta AI-default look.
        ink: {
          DEFAULT: "#231631", // deep aubergine-plum, near-black
          soft: "#3E2C52",
          muted: "#6B5A80",
        },
        marigold: {
          DEFAULT: "#E4A11B", // warm gold — celebration, not corporate-yellow
          soft: "#F3D48A",
        },
        rose: {
          DEFAULT: "#B23A55", // warm rose-red accent, distinct from terracotta
          soft: "#E7B3C0",
        },
        linen: "#FBF5EC", // warm off-white background, slight peach undertone
        sage: "#5C7A5E", // muted green for success/verified states
      },
      fontFamily: {
        display: ["\"Fraunces\"", "Georgia", "serif"],
        body: ["\"Inter\"", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(35, 22, 49, 0.08)",
        lifted: "0 8px 30px rgba(35, 22, 49, 0.14)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
