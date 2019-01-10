#!/usr/bin/env node
'use strict';

const express = require('express');
const os = require('os');
const app = express();
const https = require('https');
const watch = require('node-watch');
const fs = require('fs');
const program = require('commander');
const chalk = require('chalk');
const clipboard = require('copy-paste');

// eslint-disable-next-line no-sync
const version = JSON.parse(fs.readFileSync(__dirname + '/package.json')).version;

const server = https.createServer({
	key: fs.readFileSync(__dirname + '/ssl/server.key'), // eslint-disable-line no-sync
	cert: fs.readFileSync(__dirname + '/ssl/server.crt'), // eslint-disable-line no-sync
	ca: fs.readFileSync(__dirname + '/ssl/ca.crt') // eslint-disable-line no-sync
}, app);

const io = require('socket.io')(server);

program
	.usage('[options]')
	.version(version)
	.option('-p, --port <port>', 'Port number', 3000)
	.option('--no-color', 'Disable coloring')
	.option('--no-copy', 'Disable copying the JavaScript command to the clipboard')
	.parse(process.argv);

if (!program.color) {
	chalk.enable = false;
}

let revision = 'default';
const cwd = process.cwd();

const hosts = getNetworks().map((network) => {
	return 'https://' + network.address + ':' + program.port;
});
let host = hosts[0];

let inClipboardMsg = '';

if (program.copy) {
	clipboard.copy('window.enableLiveReload(' + JSON.stringify(hosts) + ');');
	inClipboardMsg = chalk.yellow(' (it\'s already in your clipboard)');
}

server.listen(program.port, () => {
	console.log('Server listening on port', chalk.bold(program.port));
	console.log('');
	console.log(chalk.underline('To enable live reload do this:'));
	console.log('');
	console.log(chalk.bold(' *'), 'Open an article in', chalk.bold.blue('LayoutPreview'));
	console.log(chalk.bold(' *'), 'Open the', chalk.bold.blue('Web Inspector console'));
	console.log(chalk.bold(' *') + ' Run the following ' + chalk.bold.blue('JavaScript') + ' command%s:', inClipboardMsg);
	console.log('');
	console.log(chalk.white('    window.enableLiveReload(%s);'), chalk.green(JSON.stringify(hosts)));
	console.log('');
	console.log('NB! If you get', chalk.red('net::ERR_INSECURE_RESPONSE'), 'go to', chalk.yellow.bold(host + '/ready'), 'and allow the browser to use the self-signed certificate');
	console.log(chalk.bold('**********************************************************'));
	console.log('');
});

app.get('/ready', (req, res) => {
	res.send('Congratulations! You are ready to start using LayoutPreview live reload!');
});

app.use(express.static(cwd + '/assets', {
	setHeaders(res) {
		res.set('Access-Control-Allow-Origin', '*');
	}
}));

app.use(express.static(cwd, {
	setHeaders(res) {
		res.set('Access-Control-Allow-Origin', '*');
	}
}));

const builders = [
	require('./builders/templates'),
	require('./builders/scss')
];

io.on('connection', (socket) => {
	host = 'https://' + socket.handshake.headers.host;
	console.log('got connection', socket.handshake.headers);
	socket.on('revision', (rev) => {
		console.log('Assets revision', chalk.bold.magenta(rev) + '\n');
		startWatching();

		revision = rev;
	});

	socket.on('disconnect', () => {
		console.log(chalk.red('Client disconnected'));
	});
});

function buildAll() {
	builders.forEach((builder) => {
		runBuilder(builder);
	});
}

function runBuilder(builder) {
	builder.build({
		revision: revision,
		host: host
	}, (result) => {
		console.log('[%s]\tbuild [ %s ]', chalk.bold.blue(builder.description || builder.type), chalk.bold.green('OK'));
		io.sockets.emit(builder.type, result);
	});
}

let isWatching = false;

function startWatching() {
	if (isWatching) {
		buildAll();
		return;
	}

	isWatching = true;

	builders.forEach((builder) => {
		if (!builder.activate) {
			watchBuilder(builder);
		} else {
			builder.activate()
				.then(() => {
					watchBuilder(builder);
				})
				.catch((error) => {
					console.log(chalk.red(error));
				});
		}
	});
}

const builderFiles = {};

function watchBuilder(builder) {
	runBuilder(builder);

	builder.files.forEach((files) => {
		console.log(
			'Watching %s for %s',
			chalk.bold.magenta(files.replace(cwd, '.')),
			chalk.bold.blue(builder.type)
		);

		if (!builderFiles[files]) {
			registerWatcher(files);
		}
		builderFiles[files].push(builder);
	});

}

function registerWatcher(path) {
	console.log('registering watcher on', path);
	builderFiles[path] = [];

	watch(path, {recursive: true}, (evt, filename) => {
		builderFiles[path].forEach((builder) => {
			if (!builder.filterFile(filename)) {
				return;
			}

			console.log(
				'[%s]\t%s changed',
				chalk.bold.blue(builder.type),
				chalk.bold.magenta(filename.replace(cwd, '.'))
			);

			runBuilder(builder);
		});
	});
}


function getNetworks() {
	const interfaces = os.networkInterfaces();

	const ips = [];

	Object.keys(interfaces).forEach((iface) => {
		const networks = interfaces[iface].filter((network) => {
			return network.family === 'IPv4' && !network.internal;
		});

		networks.forEach((network) => {
			ips.push({iface: iface, address: network.address});
		});
	});

	return ips;
}
