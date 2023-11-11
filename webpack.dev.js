const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')
const path = require('path')
require('dotenv').config()

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        liveReload: true,
        static: {
            directory: path.join(__dirname, 'public'), // Change the static directory to ./public
        },
        hot: true,
        open: true, // Opens the default browser when the server starts
        port: process.env.PORT || 3000,
    },
})
