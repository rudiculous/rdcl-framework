"use strict";

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const co = require('co');
const glob = require('glob');
const less = require('less');
const UglifyJS = require('uglify-js');
const yaml = require('js-yaml');

const config = require('../../config');


const regExpEscapeRE = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
let settingsPromise = new Promise(function executor(resolve) {
    resolve(null);
});

let helpers = exports = module.exports = {
    build(baseDir) {
        const assetsPublicDir = path.join(baseDir, 'public', 'assets');
        const appAssetsDir = path.join(baseDir, 'app', 'assets');
        const vendorAssetsDir = path.join(baseDir, 'vendor', 'assets');

        settingsPromise = config.get(path.join(baseDir, 'settings'), 'production');

        return co(function* () {
            let manifest = yield helpers.loadManifest(
                path.join(appAssetsDir, 'manifest.yml'),
                [appAssetsDir, vendorAssetsDir],
                false
            );

            let promises = [];

            for (let file of Object.keys(manifest.javascripts)) {
                promises.push(_buildJavascript(file, manifest.javascripts[file]));
            }

            for (let file of Object.keys(manifest.stylesheets)) {
                promises.push(_buildStylesheet(file, manifest.stylesheets[file]));
            }

            let files = yield Promise.all(promises);

            let newManifest = {};
            for (let file of files) {
                if (file != null) {
                    newManifest[file.asset] = file.target;
                }
            }

            yield _writeFile(path.join(assetsPublicDir, 'manifest.json'), JSON.stringify(newManifest), false);
        });

        function _buildJavascript(asset, files) {
            return new Promise(function executor(resolve, reject) {
                let promises = [];
                for (let file of files) {
                    promises.push(_readFile(file));
                }

                Promise.all(promises).then(function success(filesData) {
                    let result = UglifyJS.minify(filesData, {
                        fromString: true,
                        mangle: true,
                        warnings: true,
                    });

                    let fileName = _getFileName(asset, _getDigest(result.code));
                    let file = path.join(assetsPublicDir, fileName);

                    _writeFile(file, result.code).then(function success() {
                        resolve({
                            asset: asset,
                            target: fileName,
                            path: file,
                        });
                    }, function failure(err) {
                        reject(err);
                    });
                }, function failure(err) {
                    reject(err);
                });
            });
        }

        function _buildStylesheet(asset, files) {
            return new Promise(function executor(resolve, reject) {
                let promises = [];
                let importPaths = [
                    appAssetsDir,
                    vendorAssetsDir,
                ];

                for (let file of files) {
                    promises.push(_readFileLess(importPaths, file));
                }

                Promise.all(promises).then(function success(filesData) {
                    let result = '';

                    for (let fileData of filesData) {
                        result += fileData.css;
                    }

                    let fileName = _getFileName(asset, _getDigest(result));
                    let file = path.join(assetsPublicDir, fileName);

                    _writeFile(file, result).then(function success() {
                        resolve({
                            asset: asset,
                            target: fileName,
                            path: file,
                        });
                    }, function failure(err) {
                        reject(err);
                    });
                }, function failure(err) {
                    reject(err);
                });
            });
        }
    },

    loadManifest(source, assetSources, truncatePaths) {
        let regexps = [];
        if (truncatePaths == null) truncatePaths = true;

        for (let source of assetSources) {
            regexps.push(new RegExp(helpers.tags.regexp`^${source}/`));
        }

        let promise = new Promise(function executor(resolve, reject) {
            fs.readFile(source, { encoding: 'utf-8' }, function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        resolve(yaml.safeLoad(data));
                    }
                    catch (err) {
                        reject(err);
                    }
                }
            });
        });

        return co(function* () {
            let manifest = yield promise;

            for (let file of Object.keys(manifest.javascripts)) {
                manifest.javascripts[file] = yield helpers.expandGlobs(
                    assetSources,
                    manifest.javascripts[file]
                );

                if (truncatePaths) {
                    for (let i = 0; i < manifest.javascripts[file].length; i += 1) {
                        manifest.javascripts[file][i] = _replace(manifest.javascripts[file][i]);
                    }
                }
            }

            for (let file of Object.keys(manifest.stylesheets)) {
                manifest.stylesheets[file] = yield helpers.expandGlobs(
                    assetSources,
                    manifest.stylesheets[file]
                );

                if (truncatePaths) {
                    for (let i = 0; i < manifest.stylesheets[file].length; i += 1) {
                        manifest.stylesheets[file][i] = _replace(manifest.stylesheets[file][i]);
                    }
                }
            }

            return manifest;
        });

        function _replace(path) {
            for (let re of regexps) {
                path = path.replace(re, '');
            }

            return path;
        }
    },

    expandGlobs(/* ...paths */) {
        let paths = Array.prototype.slice.call(arguments);
        let last = paths[paths.length - 1];
        let searchSpace = _toGlob(paths.slice(0, paths.length - 1));

        return co(function* () {
            let results = [];
            if (Array.isArray(last)) {
                for (let file of last) {
                    _pushAll(results, yield _find(searchSpace, file));
                }
            }
            else {
                _pushAll(results, yield _find(searchSpace, last));
            }

            return results;
        });
    },

    tags: {
        regexp(strings/*, ...values*/) {
            let values = Array.prototype.slice.call(arguments, 1);
            const nrValues = values.length;
            let res = strings[0];

            for (let i = 0; i < nrValues; i += 1) {
                res += String(values[i])
                    .replace(regExpEscapeRE, '\\$&');
                res += strings[i + 1];
            }

            return res;
        },

        html(strings/*, ...values*/) {
            let values = Array.prototype.slice.call(arguments, 1);
            const nrValues = values.length;
            let res = strings[0];

            for (let i = 0; i < nrValues; i += 1) {
                res += String(values[i])
                    .replace('&', '&amp;')
                    .replace('<', '&lt;')
                    .replace('>', '&gt;')
                    .replace('"', '&quot;');
                res += strings[i + 1];
            }

            return res;
        },
    }
}

function _toGlob(paths) {
    let res = [];

    for (let path of paths) {
        if (Array.isArray(path)) {
            res.push('{' + path.join(',') + '}');
        }
        else {
            res.push(path);
        }
    }

    return res.join('/');
}

function _pushAll(arr1, arr2) {
    for (let el of arr2) arr1.push(el);
}

function _find(paths, file) {
    return new Promise(function executor(resolve, reject) {
        glob(paths + '/' + file, function (err, files) {
            if (err) {
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}

function _getDigest(data) {
    let shasum = crypto.createHash('sha1');
    shasum.update(data);
    return shasum.digest('hex');
}

function _getFileName(asset, digest) {
    for (let ext of [ '.css', '.js' ]) {
        if (asset.endsWith(ext)) {
            let base = asset.substring(0, asset.length - ext.length);
            return base + '-' + digest + ext;
        }
    }

    return digest + '-' + asset;
}

function _readFile(file) {
    return new Promise(function executor(resolve, reject) {
        fs.readFile(file, { encoding: 'utf-8' }, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function _readFileLess(paths, file) {
    return co(function* () {
        let settings = yield settingsPromise;
        let data = yield _readFile(file);

        let assetPath = null;
        for (let dir of paths) {
            if (file.startsWith(dir)) {
                assetPath = file.substring(dir.length);
                break;
            }
        }
        if (assetPath == null) {
            console.warn('Could not match %s to one of [%s].', file, paths.join(', '));
            assetPath = file;
        }

        let importDirs = [];
        for (let dir of paths) {
            importDirs.push(path.dirname(path.join(dir, assetPath)));
        }
        for (let dir of paths) {
            importDirs.push(dir);
        }

        let parsed = yield less.render(data, {
            paths: importDirs,
            compress: true,
            globalVars: {
                assetBaseUrl: `"${settings.mediaBaseUrl}assets/"`,
                mediaBaseUrl: `"${settings.mediaBaseUrl}"`,
            },
        });

        return parsed;
    });
}

function _writeFile(file, data, writeGz) {
    if (writeGz == null) writeGz = true;

    return new Promise(function executor(resolve, reject) {
        fs.writeFile(file, data, function (err) {
            if (err) {
                console.warn('Failed to write file %s', file);
                reject(err);
            }
            else {
                console.log('Successfully created %s', file);

                if (writeGz) {
                    let gzip = zlib.createGzip();
                    let inp = fs.createReadStream(file);
                    let out = fs.createWriteStream(file + '.gz');

                    inp.pipe(gzip).pipe(out);

                    out.once('close', function () {
                        console.log('Successfully created %s.gz', file);
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            }
        });
    });
}
