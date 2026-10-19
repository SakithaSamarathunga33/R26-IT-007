// Babel setup for the Expo build; the expo preset handles React Native + TypeScript.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
