module.exports = {

    // Recommended features
    "extends": "eslint:recommended",

    //Parser features
    parserOptions: {
        ecmaVersion: 12,
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
            experimentalObjectRestSpread: true
        }
    },

    // Specific rules, 2: err, 1: warn, 0: off
    rules: {
        "prefer-arrow-callback": 2,
        "no-mixed-spaces-and-tabs": 1,
        "no-unused-vars": [ 1, { vars: 'all', args: 'none' } ] // All variables, no function arguments
    },

    // What environment to run in
    env:{
        node: true,
        browser: false,
        mocha: false,
        jest: false,
        es6: true
    },

    // What global variables should be assumed to exist
    globals: {
        context: false
    }
}