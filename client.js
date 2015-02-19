var server = 'http://localhost:3000'

console.log('LOADED CLIENT.JS');

$(function() {
    var socket = io(server);

    window.parent.$('.iframe-container').css('background-color', '#1E1E1E');

    var $iframe = window.parent.$('iframe');
    var format = window.app.format;
    var resizeView = window.app.articleEditView.previewResizeView;

    var activate = resizeView.activate;

    resizeView.activate = function () {
        var args = [].slice.call(arguments);

        console.log('RESIZEVIEW START');
        $iframe.css({
            position: 'static',
            width: '100%',
            left: 'auto',
            'margin-left': 'auto'
        });

        setTimeout(function () {
            activate.apply(resizeView, args);
        }, 100);
    };

    format.on('change:name', resizeIframe);
    resizeView.on({
        end: resizeIframe,
        deactivate: resizeIframe
    });

    function resizeIframe() {
        var width = format.get('width');

        $iframe.css({
            position: 'absolute',
            left: '50%',
            'margin-left': (width / -2) + 'px',
            width: width + 'px'
        });
    }

    socket.on('connect', function () {
        console.log('Connected to server');
        socket.emit('revision', window.app.chrome.options.assetRevisionHash);
    });

    socket.on('reconnect', function () {
        console.log('REconnected to server');
        socket.emit('revision', window.app.chrome.options.assetRevisionHash);
    });

    socket.on('stylesheets', function (urls) {
        console.log('Received stylesheets');

        $('.alf-asset-stylesheet, .alf-injected-stylesheet').remove();

        _.each(urls, function (url) {
            var $link = $('<link rel="stylesheet" media="screen" type="text/css">');

            $link
                // Adding this will cause LP to try to parse it,
                // which will not work untill Chrome supports this
                // .addClass('alf-asset-stylesheet')
                .addClass('alf-injected-stylesheet')
                .attr('crossorigin', 'anonymous')
                .attr('crossOrigin', 'anonymous')
                .attr('href', url);

            $('head').append($link);
        });

        setTimeout(function () {
            window.app.chrome.article.hasCalculatedMetrics = false;
            window.app.chrome.reflow();
        }, 200);
    });

    socket.on('templates', function (templates) {
        var format = require('appstate').get('format');

        window.app.setupTemplates('<div>' + templates + '</div>');
        window.app.chrome.article.revert();
        window.app.chrome.article.setTemplates(window.app.templates[format.name]);
        window.app.chrome.refreshArticle();
    });
});
