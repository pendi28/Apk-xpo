
const base = require("./app.json").expo;

module.exports = ({ config }) => ({
  ...base,
  extra: {
    ...base.extra,
    tmdbKey: process.env.TMDB_API_KEY || process.env.EXPO_PUBLIC_TMDB_KEY || "",
    firebaseSecret: process.env.FIREBASE_DB_SECRET || process.env.EXPO_PUBLIC_FIREBASE_SECRET || "",
  },
});
