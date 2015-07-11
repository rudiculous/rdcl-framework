"use strict";

const path = require('path');

const ms = require('ms');
const send = require('koa-send');

const helpers = require('./helpers');


exports.construct = function* construct(app, baseDir) {
    const assetsDir = path.join(baseDir, 'public', 'assets');
    const manifest = require(path.join(assetsDir, 'manifest.json'));

    app.locals.add_javascript_tag = function addJavaScriptTag(file) {
        if (manifest[file] != null) {
            return helpers.tags.html`<script type="text/javascript" src="/assets/${manifest[file]}"></script>\n`;
        }
        else {
            return '';
        }
    }

    app.locals.add_stylesheet_link = function addStylesheetLink(file) {
        if (manifest[file] != null) {
            return helpers.tags.html`<link rel="stylesheet" type="text/css" href="/assets/${manifest[file]}"></script>\n`;
        }
        else {
            return '';
        }
    }
};

exports.serve = function serve(baseDir) {
    const assetsDir = path.join(baseDir, 'public', 'assets');
    const sendOptions = {
        gzip: true,
        hidden: false,
        maxage: ms('20 days'),
        root: assetsDir,
    };

    return function* serve(next) {
        if (this.request.url.startsWith('/assets/')) {
            let assetPath = this.request.url.substring('/assets'.length);

            if (this.body === null && this.status === 404) {
                yield(send, this, assetPath, sendOptions);
            }
        }

        yield next;
    }
};
