var cp = require('child_process');
var glob = require('glob');
var shortId = require('shortid');
var fs = require('fs');
var chalk = require('chalk');
var when = require('when');
var less = require('less');
var path = require('path');

var stylesheets = process.cwd() + '/assets/stylesheets';
var compileFileDir = stylesheets;

module.exports = {

    activate: function () {
        return when.resolve();
    },

    files: stylesheets,

    filterFile: function (file) {
        return /\.less$/.test(file);
    },

    type: 'stylesheets',

    description: 'LESS files',

    build: function (options, done) {
        glob(stylesheets + '/!(_*).less', {}, function (error, files) {
            files.forEach(function (lessFile) {
                var cssFile = lessFile.replace('.less', '.css');
                var lessOptions = {
                    filename: lessFile,
                    sourceMap: {
                        sourceMapBasepath: stylesheets,
                        sourceMapFileInline: true
                    },
                    globalVars: {
                        'alf-revision': options.revision
                    }
                };

                less.render(fs.readFileSync(lessFile).toString(), lessOptions)
                    .then(function (output) {
                        fs.writeFileSync(cssFile, output.css);

                        var fileUrl = cssFile.replace(stylesheets, options.host + '/stylesheets') + '?' + shortId.generate();

                        done([fileUrl]);
                    }).
                    catch(function (error) {
                        console.log(chalk.red.bold(error));
                        console.log(chalk.yellow(JSON.stringify(error, null, 4)));
                    })
            });
        });
    }
}
