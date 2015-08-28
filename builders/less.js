var cp = require('child_process');
var glob = require('glob');
var shortId = require('shortid');
var fs = require('fs');
var chalk = require('chalk');
var when = require('when');

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

    type: 'LESS files',

    build: function (options, done) {
        var filesToBuild = {};
        var revisionVar = '@alf-revision:"' + options.revision + '";';
        var lessc = __dirname + '/../node_modules/.bin/lessc';

        glob(stylesheets + '/!(_*).less', {}, function (error, files) {
            files.forEach(function (lessFile) {
                var cssFile = lessFile.replace('.less', '.css');

                var cmd = [
                    lessc,
                    '--global-var="alf-revision=\"' + options.revision + '\""',
                    lessFile,
                    cssFile
                ];

                cp.exec(cmd.join(' '), function (error, stdout, stderr) {
                    var ok = true;

                    if (error || stderr) {
                        console.log(chalk.red('There was an error building the files'));
                        console.log(error);
                        console.log(stderr);

                        ok = false;
                    }

                    if (stdout) {
                        console.log(stdout);
                    }

                    var fileUrl = cssFile.replace(stylesheets, options.host + '/stylesheets') + '?' + shortId.generate();

                    if (ok) {
                        done([fileUrl]);
                    }
                });
            });
        });
    }
}
