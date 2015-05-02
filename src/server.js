"use strict";

const path = require('path');

const co = require('co');
const chalk = require('chalk');
const argv = require('yargs')
    .help('help', 'Shows this message.')
    .option('host', {
        'default': 'localhost',
        'describe': 'The host to listen on.',
        'type': 'string',
    })
    .option('port', {
        'default': 3000,
        'describe': 'The port to listen on.',
    })
    .option('environment', {
        'default': process.env['NODE_ENV'] || 'development',
        'describe': 'The environment in which to run the application.',
    })
    .option('secret', {
        'describe': 'The secret to use for security purposes.',
        'type': 'array',
    })
    .option('logLevel', {
        'default': 'warning',
        'describe': 'The application log level.',
        'type': 'string',
    })
    .argv;
const Logger = require('@rdcl/logger');

const getConfig = require('./config').get;


/**
 * Starts the server.
 *
 * @param {String} options.app      The location of the app.
 * @param {String} options.settings The location of the settings.
 * @param {String} options.logDir   The directory to log to when logging to files.
 */
exports = module.exports = function server(options) {
    co(function* () {
        let environment = argv['environment'];

        let secrets = argv['secret'];
        if (secrets == null) {
            if (environment === 'production') {
                console.error(chalk.red('Refusing to start a production server without at least one secret!'));
                process.exit(1);
            }

            secrets = ['Keyboard cat'];
        }

        let config = yield getConfig(options.settings, environment);

        let logLevel = Logger.levels[argv['logLevel'].toUpperCase()];
        if (logLevel == null) {
            console.error(chalk.red('Invalid log level provided.'));
            process.exit(1);
        }

        let app = require(options.app).init({
            config,
            environment,
            secrets,
            logLevel,
            logDir: options.logDir,
            serverInfo: {
                host: argv['host'],
                port: argv['port'],
            },
        });

        let server = app.listen(argv['port'], argv['host'], function startUp() {
            console.log('Application running on %s:%s.',
                chalk.yellow(server.address().address),
                chalk.yellow(server.address().port));
        });
    }).catch(function (err) {
        console.error(err.stack);
        process.exit(1);
    });
};
