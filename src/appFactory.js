"use strict";

const path = require('path');

const bodyParser = require('koa-bodyparser');
const koa = require('koa');
const serve = require('koa-static');

const appComponents = require('./app');


/**
 * Creates an app initializer.
 *
 * @param {Function} [initialize] Additional actions to perform during
 *                                initialization. This function is executed just
 *                                before the modules are attached.
 * @return {Function} The app initializer.
 */
exports = module.exports = function appFactory(initialize) {

    let app = null;

    return {init};


    /**
     * Initializes the application.
     *
     * @param {Object}   options.baseDir        The project base dir.
     * @param {Object}   options.config         The application config.
     * @param {String}   options.environment    The environment in which to run
     *                                          the application.
     * @param {Array}    options.secrets        The secrets to use for security
     *                                          features.
     * @param {Number}   options.logLevel       A valid log level.
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

            Object.defineProperty(app.context, 'config', {
                enumerable: true,
                value: options.config,
            });

            Object.defineProperty(app, 'config', {
                enumerable: true,
                value: options.config,
            });

            appComponents.logger(app, options.logLevel);
            let logDir = path.join(options.baseDir, 'var', 'log');
            app.use(appComponents.accessLog(logDir, options.config.accessLog));
            app.use(bodyParser());
            appComponents.templateParser(options.baseDir, app);
            appComponents.serverInfo(app, options.serverInfo);

            // Additional initialization.
            if (initialize != null) {
                initialize.call(options, app);
            }

            // Attach modules.
            let modules = require(path.join(options.baseDir, 'app', 'modules'));
            modules(app);

            // Serve static files from public.
            app.use(serve(path.join(options.baseDir, 'public')));
        }

        return app;
    }
};
