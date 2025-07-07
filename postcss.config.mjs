const config = {
  plugins: process.env.NODE_ENV === "test" ? [] : ["@tailwindcss/postcss"],
};

export default config;
