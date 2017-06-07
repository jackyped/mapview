'use strict';

var path = require('path');
var express = require('express');
var app = express();
var log = require('electron-log');
var homedir = require('os').homedir();
var MBTiles = require('mbtiles-offline');
var tiletype = require('@mapbox/tiletype');

app.use(express.static(path.join(__dirname, './')));

var file = require('./src/server/file');
var loadedTiles = {};

function searchMbtiles(req, res) {
    var dir = req.params.dir ? decodeURIComponent(req.params.dir) : homedir;
    file.scan(dir, function (err, files) {
        if (err) {
            log.error(err);
            return res.end(err);
        }
        res.send(files);
    });
}

function getMetadata(req, res) {
    file.metadata(decodeURIComponent(req.params.file), function (err, metadata) {
        if (err) {
            log.error(err);
            return res.end(err);
        }
        res.send(JSON.stringify(metadata));
    });
}

function getTile(req, res) {
    var p = req.params;
    if (!loadedTiles[p.source]) {
        loadedTiles[p.source] = new MBTiles(decodeURIComponent(p.source));
    }

    loadedTiles[p.source].findOne([p.x, p.y, p.z].map(Number))
        .then(function (tile) {
            if (!tile) {
                res.writeHead(204);
                return res.end();
            }
            var headers = tiletype.headers(tile);
            res.writeHead(200, headers);
            res.end(tile);
        })
        .catch(function (err) {
            console.log(err);
            log.error(err);
            res.end();
        });
}

module.exports = function (config, callback) {
    app.get('/mbtiles/:dir', searchMbtiles);
    app.get('/mbtiles', searchMbtiles);
    app.get('/metadata/:file', getMetadata);
    app.get('/:source/:z/:x/:y.:format', getTile);

    app.listen(config.port, function () {
        callback(null, config);
    });
};
