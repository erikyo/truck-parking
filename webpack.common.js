const path = require('path')
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(png|svg|jpe?g|bin|gif|glb|gltf)$/,
                loader: 'file-loader',
                exclude: /node_modules/,
                options: {
                    esModule: false
                }
            },
        ],
    },
    output: {
        filename: 'truck-game.js',
        path: path.resolve(__dirname, './dist'),
        publicPath: '/', // Set the correct publicPath
    },
    resolve: {
        alias: {
            three: path.resolve('./node_modules/three'),
        },
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'assets', to: 'assets' }, // Copy the content of ./assets to ./dist/assets
            ],
        }),
    ],
}
