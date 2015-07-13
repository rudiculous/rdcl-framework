"use strict";

const path = require('path');

const send = require('koa-send');


// Serve certain files (such as robots.txt or favicon.ico) from the
// public dir.
exports = module.exports = function staticFiles(root) {
    const publicDir = path.join(root, 'public');

    return function* (next) {
        yield next;

        if (this.method !== 'HEAD' && this.method !== 'GET') return;
        if (this.body != null || this.status != 404) return;

        if (this.path === '/robots.txt' ||
            this.path === '/favicon.ico' ||
            this.path === '/apple-touch-icon-precomposed.png' ||
            this.path === '/apple-touch-icon.png'
        ) {

            yield send(this, this.path, {
                root: publicDir
            });
        }
    };
};
