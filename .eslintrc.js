module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: ["plugin:prettier/recommended"],
  plugins: ["prettier"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  },
  rules: {
    "prettier/prettier": "error",
    "max-len": ["error", { code: 200 }],
    "linebreak-style": 0
  }
};
