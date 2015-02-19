#!/usr/bin/env node

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var watch = require('node-watch');
var fs = require('fs');
var program = require('commander');
var chalk = require('chalk');

var revision = 'default';
var version = JSON.parse(fs.readFileSync(__dirname + '/package.json')).version;

program
    .usage('[options]')
    .version(version)
    .option('-p, --port <port>', 'port number', 3000)
    .parse(process.argv)

server.listen(program.port, function () {
  console.log('Server listening at port %d', program.port);
});

app.use(express.static(process.cwd() + '/assets', {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

var builders = [
    require('./builders/scss'),
    require('./builders/templates'),
    // require('./builders/less'),
];

var host = 'http://localhost:' + program.port;

app.get('/client.js', function (req, res) {
    host = 'http://' + req.headers.host;

    res.sendFile(__dirname + '/client.js');
});

io.on('connection', function (socket) {
    console.log(chalk.green('Connected to client'));

    socket.on('revision', function (rev) {
        console.log('Revision', chalk.green(rev));

        revision = rev;
        startWatching();
        buildAll();
    });

    socket.on('disconnect', function () {

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
        console.log(chalk.green(builder.type, 'built successfully'));

        io.sockets.emit(builder.type, result);
    });
}

function startWatching() {
    console.log(chalk.bold('Watching files for changes...'));

    builders.forEach(function (builder) {
        console.log('watching for', builder.files);

        watch(builder.files, function (filename) {
            if (!builder.filterFile(filename)) {
                return;
            }

            console.log(
                chalk.green(builder.type),
                chalk.yellow(filename),
                'changed.'
            );

            runBuilder(builder);
        });
    });
}



/*
var socketScript = document.createElement('script');
socketScript.src = 'http://localhost:3000/socket.io/socket.io.js?rand='+Math.random();
document.documentElement.firstChild.appendChild(socketScript);
setTimeout(function () {
    var clientScript = document.createElement('script');
    clientScript.src = 'http://localhost:3000/client.js';
    window.frames[0].window.io = window.io;
    window.frames[0].document.documentElement.firstChild.appendChild(clientScript);
}, 1000);
*/