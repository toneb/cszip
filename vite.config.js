const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'build/index.js'),
            name: 'cszip',
            formats: ["es"]
        },
        target: "esnext"
    }
})