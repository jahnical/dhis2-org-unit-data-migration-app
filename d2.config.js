const config = {
    type: 'app',
    name: 'data-migration',
    title: 'Data Migration',

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
