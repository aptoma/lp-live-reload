'use strict';

// const cp = require('child_process');
const glob = require('glob');
const shortId = require('shortid');
const fs = require('fs');
const chalk = require('chalk');
const when = require('when');
const sass = require('node-sass');
const path = require('path');

const stylesheets = path.normalize(process.cwd() + '/assets/stylesheets');
// const compileFileDir = stylesheets;

module.exports = {

	activate() {
		return when.resolve();
	},

	files: stylesheets,

	filterFile(file) {
		return /\.scss$/.test(file);
	},

	type: 'stylesheets',

	description: 'SCSS files',

	build(options, done) {
		// const filesToBuild = {};

		glob(stylesheets + '/**/!(_*).scss', {}, (error, files) => {
			if (error) {
				console.log(error);
			}
			files.forEach((sassFile) => {
				const cssFile = path.normalize(sassFile.replace('.scss', '.css'));
				let sassCode = fs.readFileSync(sassFile); // eslint-disable-line no-sync

				sassCode = '$alf-revision: ' + options.revision + ';' + sassCode;
				sass.render({
					file: sassFile,
					data: sassCode,
					outFile: cssFile,
					sourceMap: true
				}, (err, output) => {
					if (err) {
						console.log(chalk.red.bold(err));
						console.log(chalk.yellow(JSON.stringify(err, null, 4)));
						return;
					}

					fs.writeFileSync(cssFile, output.css); // eslint-disable-line no-sync

					let fileUrl = cssFile.replace(stylesheets, options.host + '/stylesheets') + '?' + shortId.generate();
					fileUrl = fileUrl.replace(/\\/g, '/');

					done([fileUrl]);
				});
			});
		});
	}
};
