"use strict";

const fs = require('fs');
const path = require('path');
const util = require('util');

const chalk = require('chalk');
const moment = require('moment');


exports = module.exports = function accessLog(logDir, options) {
    options = options || {};
    options.output = options.output || {type: 'stream', name: 'stdout'};
    options.colors = options.colors == null ? null : Boolean(options.colors);

    let stream;
    let type = options.output.type;

    if (type === 'none') {
        return function* accessLog(next) {
            yield next;
        }
    }
    else if (type === 'stream') {
        if (options.colors == null) {
            options.colors = true;
        }

        let name = options.output.name;
        if (name === 'stdout') {
            stream = process.stdout;
        }
        else if (name === 'stderr') {
            stream = process.stderr;
        }
        else {
            console.error('Unknown stream %s.', options.output.name);
            process.exit(1);
        }
    }
    else if (type === 'file') {
        if (options.colors == null) {
            options.colors = false;
        }

        let flags = options.output.truncate ? 'w' : 'a';
        stream = fs.createWriteStream(path.join(logDir, options.output.name), {
            flags: flags,
            encoding: 'utf-8',
        })
    }
    else {
        console.error('Unknown log type %s.', options.output.type);
        process.exit(1);
    }

    return function* accessLog(next) {
        let requestDate = moment();
        let start = process.hrtime();

        yield next;

        let end = process.hrtime(start);

        stream.write(util.format(
            "%s [%s (%s)] \"%s %s %s\" %s %s \"%s\" %s\n",

            this.req.connection.remoteAddress,

            colorize(requestDate.format('YYYY-MM-DD HH:mm:ss'), ['blue']),
            colorize(1000 * end[0] + Math.round(end[1] / 1000000) + 'ms', ['magenta']),

            colorize(this.request.method, ['yellow']),
            colorize(this.request.url, ['yellow']),
            colorize('HTTP/' + this.req.httpVersion, ['yellow']),

            colorize(this.response.status, ['magenta']),
            colorize(this.response.header['content-length'] || '-', ['magenta']),

            colorize(this.request.header['referer'] || '-', ['grey']),
            colorize(this.request.header['user-agent'] || '-', ['grey'])
        ));

        function colorize(text, colors) {
            if (!options.colors) return text;

            return colors.reduce(function(carry, color) {
                return chalk[color](carry);
            }, text);
        }
    };
}
