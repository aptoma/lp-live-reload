'use strict';

const glob = require('glob');
const fs = require('fs');

const templates = process.cwd() + '/templates/**/*.html';

module.exports = {
	files: process.cwd() + '/templates',

	type: 'templates',

	filterFile(file) {
		return /\.html$/.test(file);
	},

	build(options, done) {
		glob(templates, {}, (error, files) => {
			if (error) {
				console.error(error);
			}
			const templatesHtml = files.map((file) => {
				return fs.readFileSync(file); // eslint-disable-line no-sync
			}).join('');

			done(templatesHtml);
		});
	}
};
