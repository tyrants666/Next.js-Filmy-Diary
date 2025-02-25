/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--card)",
        foreground: "var(--foreground)",
      },
      boxShadow:{
        'custom': "0px 0px 14px 3px var(--shadow)",
      }
    },
  },
  plugins: [],
};
