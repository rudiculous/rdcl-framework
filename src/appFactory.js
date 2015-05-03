"use strict";

const fs = require('fs');
const path = require('path');
const util = require('util');

const bodyParser = require('koa-bodyparser');
const chalk = require('chalk');
const koa = require('koa');
const Logger = require('@rdcl/logger');
const moment = require('moment');
const render = require('koa-swig');
const serve = require('koa-static');
const yaml = require('js-yaml');


/**
 * Creates an app initializer.
 *
 * @param {String}   root         The application root.
 * @param {Function} modules      The application module loader.
 * @param {Function} [initialize] Additional actions to perform during
 *                                initialization. This function is executed just
 *                                before the modules are attached.
 * @return {Function} The app initializer.
 */
exports = module.exports = function appFactory(root, modules, initialize) {

    let app = null;

    return {init};


    /**
     * Initializes the application.
     *
     * @param {Object}   options.config         The application config.
     * @param {String}   options.environment    The environment in which to run
     *                                          the application.
     * @param {Array}    options.secrets        The secrets to use for security
     *                                          features.
     * @param {Number}   options.logLevel       A valid log level.
     * @param {String}   options.logDir         The directory to use when
     *                                          logging to files.
     * @param {Object}   options.serverInfo     An object containing the host
     *                                          and port on which the server
     *                                          will be running.
     * @return {koa} A Koa instance.
     */
    function init(options) {

        if (app == null) {
            app = koa();

            // Configure app.
            app.env = options.environment;
            app.keys = options.secrets;

            Object.defineProperty(app, 'name', {
                enumerable: true,
                value: path.relative(path.join(root, '..'), root),
            });

            Object.defineProperty(app.context, 'config', {
                enumerable: true,
                value: options.config,
            });

            Object.defineProperty(app, 'config', {
                enumerable: true,
                value: options.config,
            });

            __setupLogger(app, options.logLevel);
            app.use(__accessLog(options.logDir, options.config.accessLog));
            app.use(bodyParser());
            __setupTemplateParser(root, app);
            __setServerInfo(app, options.serverInfo);

            // Additional initialization.
            if (initialize != null) {
                initialize.call(options, app);
            }

            // Attach modules.
            modules(app);

            // Serve static files from public.
            app.use(serve(path.join(root, 'public')));
            app.use(serve(path.join(root, '..', 'public')));
        }

        return app;
    }
};


function __setupLogger(app, logLevel) {
    let _logger = new Logger(app.name, logLevel, {
        'streams': new Map([
            [process.stderr, new Set([
                Logger.levels.SEVERE,
                Logger.levels.WARNING,
            ])],
            [process.stdout, new Set([
                Logger.levels.INFO,
                Logger.levels.FINE,
                Logger.levels.FINER,
                Logger.levels.FINEST,
            ])],
        ]),
    });

    Object.defineProperty(app, 'logger', {
        enumerable: true,
        get: function getLogger() {
            return _logger;
        },
    });
}

function __setupTemplateParser(root, app) {
    let locals = {
        'config': app.config,
        'moment': moment,
    };

    Object.keys(app.config.template).forEach(function (key) {
        locals[key] = app.config.template[key];
    });

    let props = {
        enumerable: true,
        get: function getLocals() {
            return locals;
        },
        set: function setLocals(val) {
            Object.keys(val).forEach(function (key) {
                locals[key] = val[key];
            });
        },
    };

    Object.defineProperty(app, 'locals', props);
    Object.defineProperty(app.context, 'locals', props);

    app.context.render = render({
        'root': path.join(root, 'views'),
        //'autoescape': true,
        //'cache': 'memory',
        'ext': 'swig.html',
        'locals': locals,
        //'filters': filters,
        //'tags': tags,
        //'extensions': extensions,
    });
}

function __setServerInfo(app, serverInfo) {
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

function __accessLog(logDir, options) {
    options = options || {};
    options.output = options.output || {type: 'stream', name: 'stdout'};
    options.colors = options.colors == null ? null : Boolean(options.colors);

    let stream;
    let type = options.output.type;

    if (type === 'none') {
        return function* accessLog(next) {
            yield next;
        }
    }
    else if (type === 'stream') {
        if (options.colors == null) {
            options.colors = true;
        }

        let name = options.output.name;
        if (name === 'stdout') {
            stream = process.stdout;
        }
        else if (name === 'stderr') {
            stream = process.stderr;
        }
        else {
            console.error('Unknown stream %s.', options.output.name);
            process.exit(1);
        }
    }
    else if (type === 'file') {
        if (options.colors == null) {
            options.colors = false;
        }

        let flags = options.output.truncate ? 'w' : 'a';
        stream = fs.createWriteStream(path.join(logDir, options.output.name), {
            flags: flags,
            encoding: 'utf-8',
        })
    }
    else {
        console.error('Unknown log type %s.', options.output.type);
        process.exit(1);
    }

    return function* accessLog(next) {
        let requestDate = moment();
        let start = process.hrtime();

        yield next;

        let end = process.hrtime(start);

        stream.write(util.format(
            "%s [%s (%s)] \"%s %s %s\" %s %s \"%s\" %s\n",

            this.req.connection.remoteAddress,

            colorize(requestDate.format('YYYY-MM-DD HH:mm:ss'), ['blue']),
            colorize(1000 * end[0] + Math.round(end[1] / 1000000) + 'ms', ['magenta']),

            colorize(this.request.method, ['yellow']),
            colorize(this.request.url, ['yellow']),
            colorize('HTTP/' + this.req.httpVersion, ['yellow']),

            colorize(this.response.status, ['magenta']),
            colorize(this.response.header['content-length'] || '-', ['magenta']),

            colorize(this.request.header['referer'] || '-', ['grey']),
            colorize(this.request.header['user-agent'] || '-', ['grey'])
        ));

        function colorize(text, colors) {
            if (!options.colors) return text;

            return colors.reduce(function(carry, color) {
                return chalk[color](carry);
            }, text);
        }
    };
}
