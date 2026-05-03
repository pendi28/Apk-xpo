const base = require("./app.json").expo;

const existingPlugins = base.plugins || [];
const hasNavBar = existingPlugins.some((p) =>
  Array.isArray(p) ? p[0] === "expo-navigation-bar" : p === "expo-navigation-bar"
);

module.exports = ({ config }) => ({
  ...base,
  plugins: [
    ...existingPlugins,
    ...(hasNavBar ? [] : [["expo-navigation-bar", { position: "absolute", visibility: "visible" }]]),
  ],
  extra: {
    ...base.extra,
    tmdbKey: process.env.TMDB_API_KEY || process.env.EXPO_PUBLIC_TMDB_KEY || "",
    firebaseSecret: process.env.FIREBASE_DB_SECRET || process.env.EXPO_PUBLIC_FIREBASE_SECRET || "",
  },
});
