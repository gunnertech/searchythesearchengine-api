'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

var _requestPromise = require('request-promise');

var _requestPromise2 = _interopRequireDefault(_requestPromise);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _v = require('uuid/v1');

var _v2 = _interopRequireDefault(_v);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();
var readFile = _bluebird2.default.promisify(_fs2.default.readFile);

router.use(function (req, res, next) {

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, EncryptionKey");

  next();
});

var esClient = new _elasticsearch2.default.Client({
  host: process.env.BONSAI_URL,
  log: 'trace'
});

router.get('/bulk-import', function (req, res, next) {
  var options = {
    uri: 'https://raw.githubusercontent.com/sitepoint-editors/node-elasticsearch-tutorial/master/data.json',
    json: true
  };
  // console.log(path.join(__dirname, '/../../data/data1.json'))
  // rp(options)
  readFile(_path2.default.join(__dirname, '/../../data/data4.json')).then(function (data) {
    console.log(JSON.parse(data));
    var bulkBody = [];

    JSON.parse(data).forEach(function (item) {
      bulkBody.push({
        index: {
          _index: 'library',
          _type: 'article',
          _id: item.id
        }
      });

      bulkBody.push(item);
    });

    console.log(bulkBody);

    return esClient.bulk({ body: bulkBody });
  }).then(function (message) {
    return res.json(message);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.get('/put-mappings', function (req, res, next) {
  var body = {
    article: {
      properties: {
        keywords: { type: 'text', fielddata: true }
      }
    }
  };

  esClient.indices.putMapping({ index: "library", type: "article", body: body }).then(function (message) {
    return res.json(message);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.get('/indices', function (req, res, next) {
  return esClient.cat.indices({ v: true }).then(function (message) {
    return res.json({ message: message });
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.get('/all', function (req, res, next) {
  var body = {
    size: 20,
    from: req.query.from || 0,
    query: {
      match_all: {}
    }
  };

  return esClient.search({ index: 'library', body: body }).then(function (results) {
    return res.json(results);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.get('/query', function (req, res, next) {
  // req.query.type SEE: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html#multi-match-types
  // req.query.fields SEE: https://raw.githubusercontent.com/sitepoint-editors/node-elasticsearch-tutorial/master/data.json
  var body = {
    size: 20,
    from: req.query.from || 0,
    query: {
      multi_match: {
        query: req.query.search || 'culpa ad cillum',
        fields: (req.query.fields || 'title,authors.*name,body,keywords').split(','),
        minimum_should_match: 3,
        fuzziness: 2,
        type: req.query.type || 'best_fields'
      }
    }
  };

  return esClient.search({ index: 'library', body: body }).then(function (results) {
    return res.json(results);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.get('/aggregations', function (req, res, next) {
  var body = {
    size: 0,
    from: req.query.from || 0,
    query: {
      match_all: {}
    },
    aggregations: {
      min_year: {
        min: { field: 'year' }
      },
      max_year: {
        max: { field: 'year' }
      },
      year_percentile: {
        percentiles: { field: 'year' }
      },
      year_histogram: {
        histogram: { field: 'year', interval: 5 }
      },
      keywords: {
        terms: {
          field: 'keywords',
          size: 20
        }
      }
    }
  };

  return esClient.search({ index: 'library', body: body }).then(function (results) {
    return res.json(results);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.get('/suggestions', function (req, res, next) {
  var body = {
    text: req.query.phrase || 'dolo lore fugi',
    titleSuggester: {
      term: {
        field: 'title'
      }
    }
  };

  return esClient.suggest({ index: 'library', body: body }).then(function (results) {
    return res.json(results);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

router.post('/', function (req, res, next) {
  console.log(req.body);
  var id = (0, _v2.default)();
  var body = Object.assign({ id: id }, (req.body || {}).article || {});

  return esClient.create({ index: 'library', type: "article", id: id, body: body }).then(function (results) {
    return res.json(results);
  }).catch(function (err) {
    return res.status(500).json({ message: err });
  });
});

module.exports = router;