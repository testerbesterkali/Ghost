const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
    const isProd = argv.mode === 'production';

    return {
        entry: {
            'service-worker': './src/background/service-worker.ts',
            'content-script': './src/content/content-script.ts',
            'popup': './src/popup/popup.ts',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        resolve: {
            extensions: ['.ts', '.js'],
            alias: {
                '@types': path.resolve(__dirname, 'src/types'),
                '@capture': path.resolve(__dirname, 'src/capture'),
                '@privacy': path.resolve(__dirname, 'src/privacy'),
                '@transport': path.resolve(__dirname, 'src/transport'),
            },
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: 'manifest.json', to: 'manifest.json' },
                    { from: 'src/popup/popup.html', to: 'popup.html' },
                    { from: 'src/popup/popup.css', to: 'popup.css' },
                    { from: 'icons', to: 'icons', noErrorOnMissing: true },
                ],
            }),
        ],
        // Manifest V3 CSP: no eval allowed
        devtool: isProd ? false : 'cheap-module-source-map',
        optimization: {
            minimize: isProd,
        },
    };
};
