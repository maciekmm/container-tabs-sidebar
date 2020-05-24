module.exports = {
    env: {
        browser: true,
    },
    ignorePatterns: ["node_modules/"],
    extends: ["plugin:prettier/recommended", "prettier"],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
    },
    plugins: ["prettier"],
    rules: {
        "prettier/prettier": "error",
    },
}
