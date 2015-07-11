"use strict";

exports = module.exports = function (gulp, root) {
    gulp = require('gulp-help')(gulp);

    require('./tasks/assets')(gulp, root);

    return gulp;
};
