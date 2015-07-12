"use strict";

const fs = require('fs');
const path = require('path');

const glob = require('glob');
const less = require('less');
const send = require('koa-send');

const helpers = require('./helpers');


exports.construct = function* construct(app, baseDir) {
    const appAssetsDir = path.join(baseDir, 'app', 'assets');
    const vendorAssetsDir = path.join(baseDir, 'vendor', 'assets');

    let manifest = yield helpers.loadManifest(
        path.join(appAssetsDir, 'manifest.yml'),
        [appAssetsDir, vendorAssetsDir]
    );

    app.logger.finer(manifest);

    app.locals.add_javascript_tag = function addJavaScriptTag(file) {
        let html = '';

        if (manifest.javascripts[file] != null) {
            for (let path of manifest.javascripts[file]) {
                html += helpers.tags.html`<script type="text/javascript" src="/assets/${path}"></script>\n`;
            }
        }

        return html;
    }

    app.locals.add_stylesheet_link = function addStylesheetLink(file) {
        let html = '';

        if (manifest.stylesheets[file] != null) {
            for (let path of manifest.stylesheets[file]) {
                html += helpers.tags.html`<link rel="stylesheet" type="text/css" href="/assets/${path}"></script>\n`;
            }
        }

        return html;
    }
};

exports.serve = function serve(baseDir) {
    const assetDirs = [
        path.join(baseDir, 'app', 'assets'),
        path.join(baseDir, 'vendor', 'assets'),
    ];

    return function* serve(next) {
        if (this.request.url.startsWith('/assets/')) {
            let assetPath = this.request.url.substring('/assets'.length);

            // FIXME: Support for coffeescript, react, etc.
            if (this.request.url.endsWith('.less')) {
                let css = yield _readLess(this, assetPath);
                if (css != null) {
                    this.body = css;
                    this.status = 200;
                    this.response.type = 'text/css; charset=utf-8';
                }
            }

            for (let root of assetDirs) {
                if (_responseServed(this)) break;
                yield send(this, assetPath, { root });
            }
        }

        yield next;
    }

    function _responseServed(context) {
        return context.body != null || context.status != 404;
    }

    function _readLess(context, assetPath) {
        return new Promise(function executor(resolve, reject) {
            glob('{' + assetDirs.join(',') + '}/' + assetPath, function (err, files) {
                if (err || files.length < 1) {
                    context.app.logger.warning('Failed to resolve glob:', err);
                    resolve(null);
                }
                else {
                    let fullPath = files[0];

                    fs.readFile(fullPath, { encoding: 'utf-8' }, function (err, data) {
                        if (err) {
                            context.app.logger.warning('Failed to read file:', err);
                            resolve(null);
                        }
                        else {
                            let importDirs = [];
                            for (let dir of assetDirs) {
                                importDirs.push(path.dirname(path.join(dir, assetPath)));
                            }
                            for (let dir of assetDirs) {
                                importDirs.push(dir);
                            }

                            less.render(data, {
                                paths: importDirs,
                                compress: false,
                                globalVars: {
                                    assetBaseUrl: `"/assets/"`,
                                    mediaBaseUrl: `"${context.mediaBaseUrl}"`,
                                },
                            }, function (err, parsed) {
                                if (err) {
                                    context.app.logger.warning('Failed to parse less:', err);
                                    resolve(null);
                                }
                                else {
                                    //context.app.logger.finest(parsed.imports);
                                    resolve(parsed.css);
                                }
                            });
                        }
                    });
                }
            });
        });
    }
}
