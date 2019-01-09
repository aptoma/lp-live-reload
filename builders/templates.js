'use strict';

const glob = require('glob');
const fs = require('fs');

const templates = process.cwd() + '/templates/**/*.html';
const components = process.cwd() + '/components/**/*.html';

module.exports = {
	files: [
		process.cwd() + '/templates',
		process.cwd() + '/components'
	],

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

			glob(components, {}, (error, files) => {
				if (error) {
					console.error(error);
				}
				const componentsHtml = files.map((file) => {
					return fs.readFileSync(file); // eslint-disable-line no-sync
				}).join('');

				done(templatesHtml + componentsHtml);
			});
		});
	}
};
