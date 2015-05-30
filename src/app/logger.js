"use strict";

const Logger = require('@rdcl/logger');


exports = module.exports = function logger(app, logLevel) {
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
