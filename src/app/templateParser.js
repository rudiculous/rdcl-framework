"use strict";

const path = require('path');

const moment = require('moment');
const render = require('koa-swig');


exports = module.exports = function templateParser(root, app) {

    let filters = require('./filters');

    Object.defineProperty(app, 'filters', {
        enumerable: true,
        get: function getFilters() {
            return filters;
        },
        set: function setFilters(val) {
            Object.keys(val).forEach(function (key) {
                filters[key] = val[key];
            });
        },
    });

    let locals = {
        'environment': app.env,
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
        root: path.join(root, 'app', 'views'),
        autoescape: true,
        cache: 'memory',
        ext: 'swig.html',
        locals,
        filters,
        //tags: tags,
        //extensions: extensions,
    });
}
