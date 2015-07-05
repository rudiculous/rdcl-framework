"use strict";

const knex = require('knex');
const bookshelf = require('bookshelf');

/**
 * Creates a bookshelf instance.
 *
 * @param {Object} config
 * @return {Promise}
 */
exports.init = function init(config) {
    return new Promise(function executor(resolve, reject) {
        exports.database = knex(config);
        exports.orm = bookshelf(exports.database);

        resolve({
            database: exports.database,
            orm: exports.orm,
        });
    });
};
