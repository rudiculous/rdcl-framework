"use strict";

const co = require('co');

const helpers = require('./helpers');

exports.assets = function assets(app, baseDir) {
    app.logger.fine('Initializing asset pipeline.');

    let mod;
    if (app.env === 'production' || app.env === 'testing') {
        mod = require('./production');
    }
    else {
        mod = require('./development');
    }

    app.use(mod.serve(baseDir));

    return co(function* () {
        yield* mod.construct(app, baseDir);
    }).then(function coSuccess() {
        app.logger.info('Finished initializing asset pipeline.');
    }, function coFail(err) {
        app.logger.severe(err);
        setImmediate(process.exit, 1);
    });
};

exports.build = helpers.build;
