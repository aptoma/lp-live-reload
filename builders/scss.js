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
        return when.promise(function (resolve, reject) {
            cp.exec('which scss', function (error, stdout, stderr) {
                if (error || stderr) {
                    var msg = '';

                    msg += "*********************\n";
                    msg += "SCSS is not installed! Install it using:\n";
                    msg += "\n";
                    msg += chalk.yellow(" $ gem install sass");
                    msg += "\n*********************\n";

                    reject(msg);
                } else {
                    resolve();
                }
            });
        });
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
                filesToBuild[sassFile] = sassFile.replace('.scss', '.css');
            });

            if (files.length) {
                buildFiles(filesToBuild, options, done);
            }
        });
    }
}

function buildFiles(filesToBuild, options, done) {
    var filesToBuildCmd = [];
    var revisionVar = '$alf-revision:"' + options.revision + '";';
    var compileFiles = [];

    Object.keys(filesToBuild).forEach(function (sassFile) {
        var mainFileContents = fs.readFileSync(sassFile);
        var compileFile = compileFileDir + '/' + shortId.generate() + '.compile';

        // Make sure it's deleted afterwards
        compileFiles.push(compileFile);

        fs.writeFileSync(compileFile,  revisionVar + mainFileContents);

        filesToBuildCmd.push(compileFile + ':' + filesToBuild[sassFile]);
    });

    var cmd = 'scss "' + filesToBuildCmd.join(' ') + '"';
    cp.exec(cmd, function (error, stdout, stderr) {
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

        compileFiles.forEach(function (compileFile) {
            fs.unlink(compileFile);
        });

        if (ok) {
            var styleUrls = Object.keys(filesToBuild).map(function (key) {
                return filesToBuild[key].replace(stylesheets, options.host + '/stylesheets') + '?' + shortId.generate();
            });

            done(styleUrls);
        }
    });
}