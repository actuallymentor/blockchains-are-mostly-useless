import js from '@eslint/js'
import globals from 'globals'

export default [

	js.configs.recommended,

	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node
		},

		// 2: error, 1: warn, 0: off
		rules: {
			'prefer-arrow-callback': 2,
			'no-mixed-spaces-and-tabs': 1,
			'no-unused-vars': [ 1, { vars: 'all', args: 'none' } ]
		}
	}

]
