const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = merge( common, {
    mode: 'production',
    performance: {
        hints: false,
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin(),
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
    ],
})
