import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		extends: [
			"eslint:recommended",
			"plugin:@typescript-eslint/recommended",
			"plugin:@typescript-eslint/recommended-type-checked",
			"airbnb-base",
			"airbnb-typescript/base",
			"plugin:prettier/recommended",
			"prettier"
		],
		plugins: ["@typescript-eslint", "simple-import-sort", "import"],

		rules: {
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-unsafe-enum-comparison": "off",
			"no-void": "off",
			"consistent-return": "off", // my style
			"import/order": "off", // for simple-import-order
			"import/prefer-default-export": "off", // why
			"no-restricted-syntax": "off",
			// importing rules
			"simple-import-sort/exports": "error",
			"import/first": "error",
			"import/newline-after-import": "error",
			"import/no-duplicates": "error",
			"simple-import-sort/imports": [
				"warn",
				{
					groups: [
						// Side effect imports.
						["^\\u0000"],
						// Node.js builtins prefixed with `node:`.
						["^node:"],
						// Packages.
						// Things that start with a letter (or digit or underscore), or `@` followed by a letter.
						["^@?\\w"],
						["^@app"],
						["@lib"],
						["@server"],
						// Absolute imports and other imports such as Vue-style `@/foo`.
						// Anything not matched in another group.
						["^"],
						// Relative imports.
						// Anything that starts with a dot.
						["^\\."]
					]
				}
			]
		}
	},

	{ files: ["./bin/create-expressr-app.js"], languageOptions: { sourceType: "commonjs" } },
	{ languageOptions: { globals: globals.node } },
	pluginJs.configs.recommended
];
