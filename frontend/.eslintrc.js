module.exports = {
    parser: `@typescript-eslint/parser`,
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
        "prettier/@typescript-eslint",
    ],
    plugins: ["@typescript-eslint", "prettier"],
    parserOptions: {
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
    },
    env: {
        browser: true,
        node: true,
    },
    rules: {
        'react/prop-types': 'off', // Disable prop-types as we use TypeScript for type checking
        '@typescript-eslint/explicit-function-return-type': 'off',
        quotes: "off",
        "@typescript-eslint/quotes": [
            2,
            "backtick",
            {
                avoidEscape: true,
            },
        ],
        indent: ["error", 4, { SwitchCase: 1 }],
        "prettier/prettier": [
            "error",
            {
                trailingComma: "es5",
                semi: false,
                singleQuote: false,
                printWidth: 120,
            },
        ],
    },
}
