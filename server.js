#!/usr/bin/env node

var express = require('express');
var os = require('os');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var watch = require('node-watch');
var fs = require('fs');
var program = require('commander');
var chalk = require('chalk');
var clipboard = require('copy-paste');

var version = JSON.parse(fs.readFileSync(__dirname + '/package.json')).version;

program
    .usage('[options]')
    .version(version)
    .option('-p, --port <port>', 'Port number', 3000)
    .option('--no-color', 'Disable coloring')
    .option('--no-copy', 'Disable sending the JavaScript command to the clipboard')
    .parse(process.argv)

if (!program.color) {
    chalk.enable = false;
}

var revision = 'default';
var cwd = process.cwd();

var hosts = getNetworks().map(function (network) {
    return 'http://' + network.address + ':' + program.port;
});
var host = hosts[0];

var inClipboardMsg = '';

if (program.copy) {
    clipboard.copy('window.enableLiveReload(' + JSON.stringify(hosts) + ');');
    inClipboardMsg = chalk.yellow(' (it\'s already in your clipboard)');
}

server.listen(program.port, function () {
    console.log('Server listening on port', chalk.bold(program.port));
    console.log('')
    console.log(chalk.underline('To enable live reload do this:'));
    console.log('');
    console.log(chalk.bold(' *'), 'Open an article in', chalk.bold.blue('LayoutPreview'));
    console.log(chalk.bold(' *'), 'Open the', chalk.bold.blue('Web Inspector console'));
    console.log(chalk.bold(' *') + ' Run the following ' + chalk.bold.blue('JavaScript') + ' command%s:', inClipboardMsg);
    console.log('');
    console.log(chalk.white('    window.enableLiveReload(%s);'), chalk.green(JSON.stringify(hosts)));
    console.log('');
    console.log(chalk.bold('**********************************************************'));
    console.log('');
});

app.use(express.static(cwd + '/assets', {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

var builders = [
    require('./builders/scss'),
    require('./builders/templates'),
    require('./builders/less')
];

io.on('connection', function (socket) {
    host = 'http://' + socket.handshake.headers.host;

    socket.on('revision', function (rev) {
        console.log('Assets revision', chalk.bold.magenta(rev) + "\n");

        revision = rev;
        startWatching();
    });

    socket.on('disconnect', function () {
        console.log(chalk.red('Client disconnected'));
    });
});

function buildAll() {
    builders.forEach(function (builder) {
        runBuilder(builder);
    });
}

function runBuilder(builder) {
    builder.build({
        revision: revision,
        host: host
    }, function (result) {
        console.log("[%s]\tbuild [ %s ]", chalk.bold.blue(builder.type), chalk.bold.green('OK'));
        io.sockets.emit(builder.type, result);
    });
}

var isWatching = false;

function startWatching() {
    if (isWatching) {
        buildAll();
        return;
    }

    builders.forEach(function (builder) {
        if (!builder.activate) {
            watchBuilder(builder);
        } else {
            builder.activate()
                .then(function () {
                    watchBuilder(builder);
                })
                .catch(function (error) {
                    console.log(chalk.red(error));
                });
        }
    });

    isWatching = true;
}

function watchBuilder(builder) {
    runBuilder(builder);

    console.log(
        'Watching %s for %s',
        chalk.bold.magenta(builder.files.replace(cwd, '.')),
        chalk.bold.blue(builder.type)
    );

    watch(builder.files, function (filename) {
        if (!builder.filterFile(filename)) {
            return;
        }

        console.log(
            "[%s]\t%s changed",
            chalk.bold.blue(builder.type),
            chalk.bold.magenta(filename.replace(cwd, '.'))
        );

        runBuilder(builder);
    });
}


function getNetworks() {
    var interfaces = os.networkInterfaces();

    var ips = [];

    Object.keys(interfaces).forEach(function (iface) {
        var networks = interfaces[iface].filter(function (network) {
            return network.family === 'IPv4' && !network.internal;
        });

        networks.forEach(function (network) {
            ips.push({iface: iface, address: network.address});
        });
    });

    return ips;
}
