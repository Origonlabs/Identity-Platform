module.exports = {
  "extends": [
    "../../configs/eslint/defaults.js",
    "../../configs/eslint/next.js",
  ],
  "ignorePatterns": ['/*', '!/src', '!/app'],
  rules: {
    "import/order": [
      1,
      {
        groups: [
          "external",
          "builtin",
          "internal",
          "sibling",
          "parent",
          "index",
        ],
      },
    ],
  },
};
