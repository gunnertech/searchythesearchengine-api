import express from 'express';
import Promise from 'bluebird';
import elasticsearch from 'elasticsearch';
import rp from 'request-promise';
import fs from 'fs';
import uuidV1 from 'uuid/v1';
import path         from 'path';

let router = express.Router();
let readFile = Promise.promisify(fs.readFile);

router.use((req, res, next) => {

  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, EncryptionKey");

  next();
});

const esClient = new elasticsearch.Client({
  host: process.env.BONSAI_URL,
  log: 'trace'
});

router.get('/bulk-import', (req, res, next) => {
  const options = {
    uri: 'https://raw.githubusercontent.com/sitepoint-editors/node-elasticsearch-tutorial/master/data.json',
    json: true
  };
  // console.log(path.join(__dirname, '/../../data/data1.json'))
  // rp(options)
  readFile(path.join(__dirname, '/../../data/data4.json'))
  .then(function (data) {
    console.log(JSON.parse(data))
    let bulkBody = [];

    JSON.parse(data).forEach(item => {
      bulkBody.push({
        index: {
          _index: 'library',
          _type: 'article',
          _id: item.id
        }
      });

      bulkBody.push(item);
    });

    console.log(bulkBody)

    return esClient.bulk({body: bulkBody})
  })
  .then(message => res.json(message))
  .catch(err => res.status(500).json({message: err}));
});

router.get('/put-mappings', (req, res, next) => { 
  const body = {
    article: {
      properties: {
        keywords: { type: 'text', fielddata: true }
      }
    }
  }

  esClient.indices.putMapping({index: "library", type: "article", body: body})
  .then(message => res.json(message))
  .catch(err => res.status(500).json({message: err}));
})

router.get('/indices', (req, res, next) => {
  return esClient.cat.indices({v: true})
  .then(message => res.json({message: message}))
  .catch(err => res.status(500).json({message: err}));
});

router.get('/all', (req, res, next) => {
  const body = {
    size: 20,
    from: (req.query.from || 0),
    query: {
      match_all: {}
    }
  };

  return esClient.search({index: 'library', body: body})
  .then(results => res.json(results))
  .catch(err => res.status(500).json({message: err}));
});

router.get('/query', (req, res, next) => {
  // req.query.type SEE: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html#multi-match-types
  // req.query.fields SEE: https://raw.githubusercontent.com/sitepoint-editors/node-elasticsearch-tutorial/master/data.json
  const body = {
    size: 20,
    from: (req.query.from || 0),
    query: {
      multi_match: {
        query: (req.query.search || 'culpa ad cillum'),
        fields: (req.query.fields || 'title,authors.*name,body,keywords').split(','),
        minimum_should_match: 3,
        fuzziness: 2,
        type: (req.query.type || 'best_fields')
      }
    }
  };

  return esClient.search({index: 'library', body: body})
  .then(results => res.json(results))
  .catch(err => res.status(500).json({message: err}));
});

router.get('/aggregations', (req, res, next) => {
  const body = {
    size: 0,
    from: (req.query.from || 0),
    query: {
      match_all: {}
    },
    aggregations: {
      min_year: {
        min: {field: 'year'}
      },
      max_year: {
        max: {field: 'year'}
      },
      year_percentile: {
        percentiles: {field: 'year'}
      },
      year_histogram: {
        histogram: {field: 'year', interval: 5}
      },
      keywords: {
        terms: {
          field: 'keywords',
          size: 20
        }
      }
    }
  };

  return esClient.search({index: 'library', body: body})
  .then(results => res.json(results))
  .catch(err => res.status(500).json({message: err}));
});

router.get('/suggestions', (req, res, next) => {
  const body = {
    text: (req.query.phrase || 'dolo lore fugi'),
    titleSuggester: {
      term: {
        field: 'title'
      }
    }
  };

  return esClient.suggest({index: 'library', body: body})
  .then(results => res.json(results))
  .catch(err => res.status(500).json({message: err}));
});

router.post('/', (req, res, next) => {
  console.log(req.body);
  const id = uuidV1();
  const body = Object.assign({id: id}, ((req.body||{}).article || {}));

  return esClient.create({index: 'library', type: "article", id: id, body: body})
  .then(results => res.json(results))
  .catch(err => res.status(500).json({message: err}));
});

module.exports = router;