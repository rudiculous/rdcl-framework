"use strict";

const fs = require('fs');
const path = require('path');

const yaml = require('js-yaml');


/**
 * Gets the config for a specific environment.
 *
 * @param {String} [settingsDir]
 * @param {String} [environment=development]
 * @return {Promise}
 */
exports.get = function get(settingsDir, environment) {
    if (environment == null) {
        environment = 'development';
    }

    let configPath = path.join(settingsDir, environment + '.yaml');

    return new Promise(function executor(resolve, reject) {
        fs.readFile(configPath, {
            encoding: 'UTF-8',
        }, function(err, data) {
            if (err) return reject(err);

            let config = yaml.load(data);

            if (config.mediaBaseUrl == null) {
                config.mediaBaseUrl = '/';
            }

            if (config.db && config.db.connection == null) {
                config.db.connection = process.env.DATABASE_URL;
            }

            Object.freeze(config);
            resolve(config);
        });
    });
}
