'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const path = require('path');
const fs = require('fs');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');

function resolveTailwindConfig() {
    // In the future we want to find the host app tailwind config first
    // Path to the host app's base directory
    // const hostAppTailwindPath = path.join(this.project.root, 'tailwind.js');

    // Path to the addon's base directory
    const addonTailwindPath = path.join(__dirname, 'tailwind.js');

    // Check if the file exists in the host app's base directory
    // if (fs.existsSync(hostAppTailwindPath)) {
    //     return hostAppTailwindPath;
    // }

    // Fallback to the local tailwind.js in the addon base directory
    return addonTailwindPath;
}

module.exports = {
    name,

    options: {
        autoImport: {
            publicAssetsURL: '/assets',
            alias: {
                libphonenumber: 'intl-tel-input/build/js/utils.js',
            },
        },
        postcssOptions: {
            compile: {
                enabled: true,
                cacheInclude: [/.*\.(css|scss|hbs)$/, /.*\/tailwind\/config\.js$/, /.*tailwind\.js$/],
                plugins: [
                    postcssAtRulesVariables,
                    postcssImport({
                        path: ['node_modules'],
                        plugins: [postcssAtRulesVariables, postcssImport],
                    }),
                    tailwind(resolveTailwindConfig()),
                    postcssPresetEnv({ stage: 1 }),
                    postcssMixins,
                    postcssEach,
                    autoprefixer,
                ],
            },
            filter: {
                enabled: true,
                plugins: [postcssAtRulesVariables, postcssMixins, postcssEach, postcssConditionals, tailwind(resolveTailwindConfig())],
            },
        },
    },

    included: function () {
        this._super.included.apply(this, arguments);

        // Import the `intlTelInput.min.css` file and append it to the parent application's `vendor.css`
        this.import(`node_modules/intl-tel-input/build/css/intlTelInput.min.css`);
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);

        // Use a Funnel to copy the `utils.js` file to `assets/libphonenumber`
        const intlTelInputPath = path.dirname(require.resolve('intl-tel-input'));
        const addonTree = [
            new Funnel(`${intlTelInputPath}/build/js`, {
                include: ['utils.js'],
                destDir: 'assets/libphonenumber',
            }),
            new Funnel(`${intlTelInputPath}/build/img`, {
                destDir: 'img',
                overwrite: false,
            }),
            new Funnel(path.join(__dirname, 'assets'), {
                destDir: '/',
            }),
        ];

        // Merge the addon tree with the existing tree
        return publicTree ? new MergeTrees([publicTree, ...addonTree], { overwrite: true }) : new MergeTrees([...addonTree], { overwrite: true });
    },

    isDevelopingAddon: function () {
        return true;
    },
};
