"use strict";

const path = require('path');

const co = require('co');
const chalk = require('chalk');
const argv = require('yargs')
    .help('help', 'Shows this message.')
    .option('host', {
        'default': process.env.HOST || 'localhost',
        'describe': 'The host to listen on.',
        'type': 'string',
    })
    .option('port', {
        'default': process.env.PORT || 3000,
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
        'default': process.env.LOGLEVEL || 'warning',
        'describe': 'The application log level.',
        'type': 'string',
    })
    .argv;
const Logger = require('@rdcl/logger');

const appFactory = require('./appFactory');
const getConfig = require('./config').get;


/**
 * Starts the server.
 *
 * @param {String} baseDir  The root folder.
 */
exports = module.exports = function server(baseDir, initialize) {
    co(function* () {
        let environment = argv['environment'];

        let secrets = argv['secret'];

        if (secrets == null && process.env.SECRET != null) {
            // FIXME: See if it is possible to pass multiple secrets
            // through environment variables.
            secrets = [process.env.SECRET];
        }

        if (secrets == null) {
            if (environment === 'production') {
                console.error(chalk.red('Refusing to start a production server without at least one secret!'));
                process.exit(1);
            }

            secrets = ['Keyboard cat'];
        }

        let config = yield getConfig(path.join(baseDir, 'settings'), environment);

        let database;
        let orm;
        if (config.db) {
            let res = yield require('./database').init(config.db);

            database = res.database;
            orm = res.orm;
        }

        let logLevel = Logger.levels[argv['logLevel'].toUpperCase()];
        if (logLevel == null) {
            console.error(chalk.red('Invalid log level provided.'));
            process.exit(1);
        }

        let app = appFactory(initialize).init({
            baseDir,
            config,
            environment,
            secrets,
            logLevel,
            serverInfo: {
                host: argv['host'],
                port: argv['port'],
            },
            database,
            orm,
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
