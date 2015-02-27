var glob = require('glob');
var fs = require('fs');

var templates = process.cwd() + '/templates/**/*.html';

module.exports = {
    files: process.cwd() + '/templates',

    type: 'templates',

    filterFile: function (file) {
        return /\.html$/.test(file);
    },

    build: function (options, done) {
        glob(templates, {}, function (error, files) {
            var templatesHtml = files.map(function (file) {
                return fs.readFileSync(file);
            }).join('');

            done(templatesHtml);
        });
    }
}