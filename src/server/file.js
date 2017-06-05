'use strict';

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var queue = require('d3-queue').queue;
var log = require('electron-log');
var filesize = require('filesize');
var moment = require('moment');
var tildify = require('tildify');
var MBTiles = require('mbtiles-offline');

module.exports = {
    scan: function (directory, callback) {
        var q = queue(10);

        exec('find ' + directory + ' -type f -name "*.mbtiles" 2> /dev/null', function (err, stdout) {
            if (err) {
                log.error(err);
                return callback(err);
            }

            stdout.split('\n').forEach(function (file) {
                if (file.length) {
                    q.defer(statMbtile, file);
                }
            });

            q.awaitAll(function (err, files) {
                if (err) {
                    log.error(err);
                    return callback(err);
                }

                // sort the array by last modified
                files.sort(function (a, b) {
                    return b.modified - a.modified;
                });

                files = files.map(function (file) {
                    file.modified = moment(file.modified).fromNow();
                    return file;
                });

                callback(null, files);
            });
        });
    },
    metadata: function () {

    }
};

function statMbtile(file, cb) {
    var mbtiles = new MBTiles(file);
    // yeah I know :/
    mbtiles.metadata().then(function (metadata) {
        fs.stat(file, function (err, stats) {
            if (err) return cb(err);
            // add a few more useful properties
            metadata.path = file;
            metadata.basename = path.basename(file);
            metadata.dir = tildify(path.dirname(file));
            metadata.size = filesize(stats.size);
            metadata.modified = new Date(stats.mtime);
            cb(null, metadata);
        });
    });
}
