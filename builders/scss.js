var cp = require('child_process');
var glob = require('glob');
var shortId = require('shortid');
var fs = require('fs');
var chalk = require('chalk');
var when = require('when');
var sass = require('node-sass');
var path = require('path');

var stylesheets = path.normalize(process.cwd() + '/assets/stylesheets');
var compileFileDir = stylesheets;

module.exports = {

    activate: function () {
        return when.resolve();
    },

    files: stylesheets,

    filterFile: function (file) {
        return /\.scss$/.test(file);
    },

    type: 'stylesheets',

    description: 'SCSS files',

    build: function (options, done) {
        var filesToBuild = {};

        glob(stylesheets + '/**/!(_*).scss', {}, function (error, files) {
            files.forEach(function (sassFile) {
                var cssFile = path.normalize(sassFile.replace('.scss', '.css'));
                var sassCode = fs.readFileSync(sassFile);

                sassCode = '$alf-revision: ' + options.revision + ';' + sassCode;
                sass.render({
                    file: sassFile,
                    data: sassCode,
                    outFile: cssFile,
                    sourceMap: true
                }, function (err, output) {
                    if (err) {
                        console.log(chalk.red.bold(err));
                        console.log(chalk.yellow(JSON.stringify(err, null, 4)));
                        return;
                    }

                    fs.writeFileSync(cssFile, output.css);

                    var fileUrl = cssFile.replace(stylesheets, options.host + '/stylesheets') + '?' + shortId.generate();
                    fileUrl = fileUrl.replace(/\\/g, '/');

                    done([fileUrl]);
                });
            });
        });
    }
}
