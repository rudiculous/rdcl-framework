"use strict";

exports = module.exports = function serverInfo(app, serverInfo) {
    let _serverInfo = {
        host: serverInfo.host,
        port: serverInfo.port,
    };
    Object.defineProperty(app.locals, 'serverInfo', {
        enumerable: true,
        get: function getServerInfo() {
            return _serverInfo;
        },
    });

    Object.defineProperty(_serverInfo, 'href', {
        'get': function getHref() {
            let href;

            if (app.config.href != null) {
                if (app.config.secure) {
                    href = 'https://' + app.config.href;
                }
                else {
                    href = 'http://' + app.config.href;
                }
            }
            else {
                href = app.serverInfo.host;
                let port = app.serverInfo.port;

                if (app.config.secure) {
                    href = 'https://' + href;
                    if (port !== 443) {
                        href += ':' + port;
                    }
                }
                else {
                    href = 'http://' + href;
                    if (port !== 80) {
                        href += ':' + port;
                    }
                }
            }

            return href + '/';
        },
        'enumerable': true,
    });
}
