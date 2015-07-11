"use strict";

const path = require('path');

const co = require('co');

const assets = require('../src/app/assets/helpers');


exports = module.exports = function (gulp, root) {
    gulp.task('assets:build', 'Builds all assets.', function buildAssets() {
        return assets.build(root);
    });
};
