var cp = require('child_process');
var glob = require('glob');
var shortId = require('shortid');
var fs = require('fs');
var chalk = require('chalk');

var stylesheets = process.cwd() + '/assets/stylesheets';
var compileFileDir = stylesheets;

glob(stylesheets + '/**/!(_*).scss', {}, function (error, files) {
    console.log(files);
});

module.exports = {
    files: stylesheets,

    filterFile: function (file) {
        return /\.scss$/.test(file);
    },

    type: 'stylesheets',

    build: function (options, done) {
        var filesToBuild = {};

        glob(stylesheets + '/**/!(_*).scss', {}, function (error, files) {
            files.forEach(function (sassFile) {
                filesToBuild[sassFile] = sassFile.replace('.scss', '.css');
            })

            buildFiles(filesToBuild, options, done);
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

    cp.exec('scss ' + filesToBuildCmd.join(' '), function (error, stdout, stderr) {
        if (error || stderr) {
            console.log(chalk.red('There was an error building the files'));
            console.log(error);
            console.log(stderr);

            return;
        }

        console.log(stdout);

        compileFiles.forEach(function (compileFile) {
            fs.unlink(compileFile);
        });

        var styleUrls = Object.keys(filesToBuild).map(function (key) {
            return filesToBuild[key].replace(stylesheets, options.host + '/stylesheets') + '?' + shortId.generate();
        });

        done(styleUrls);
    });
}