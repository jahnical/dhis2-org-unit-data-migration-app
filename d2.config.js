const config = {
    type: 'app',
    name: 'data-management',
    title: 'iCHIS Data Management',

    minDHIS2Version: '2.39',

    pwa: {
        enabled: true,
        caching: {
            patternsToOmitFromAppShell: [/.*/],
        },
    },

    entryPoints: {
        app: './src/AppWrapper.js',
    },
}

module.exports = config
