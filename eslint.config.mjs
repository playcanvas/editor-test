import playcanvasConfig from '@playcanvas/eslint-config';
// eslint-disable-next-line import/no-unresolved
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    ...playcanvasConfig.map(config => ({
        ignores: ['test/fixtures/**/*.js'],
        ...config
    })),
    {
        files: ['**/*.ts', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: typescriptParser,
            parserOptions: {
                requireConfigFile: false
            },
            globals: {
                ...globals.browser,
                ...globals.mocha,
                ...globals.node,
                wi: false,
                config: false,
                editor: false
            }
        },
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-type': 'off',
            'no-use-before-define': 'off',
            'no-await-in-loop': 'off',
            'no-loop-func': 'off'
        }
    },
    {
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.ts', '.mjs']
                }
            }
        }
    }
];
