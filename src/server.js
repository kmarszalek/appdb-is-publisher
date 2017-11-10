import express from 'express';
import Configuration from './lib/isql/Configuration';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import DataLoader from 'dataloader';
import {serviceDescription as graphqlServiceDescription} from './modules/infosystem/graphql';
import {expressRouter as restRouter, handleNoImlementation, handleUnknown, serviceDescription as restServiceDescription} from './modules/infosystem/rest';
import {expressRouter as proxyRouter} from './modules/couchDBProxy';

const PORT = Configuration.getServerConfiguration('http.port', 80);

function createDataLoaders(api) {
  return {
    'Site': new DataLoader(ids => api('site').getByIds(ids)),
    'SiteService': new DataLoader(ids => api('siteService').getByIds(ids)),
    'SiteServiceImage': new DataLoader(ids => api('siteServiceImage').getByIds(ids)),
    'SiteServiceTemplate': new DataLoader(ids => api('siteServiceTemplate').getByIds(ids))
  };
}

function miscRoutes(router) {
  //#######################################
  //################ MISC #################
  //#######################################

  router.get('/version', handleNoImlementation);

  router.get('/',  (req, res) => {
    let services = {
      '/couchdb': {
        description: 'A proxy service to the couch db used by the information system backend.'
      }
    };
    services = Object.assign({}, services, graphqlServiceDescription, restServiceDescription);
    services = {"services": services};

    res.setHeader('Content-Type', 'application/json');
    res.json(services);
    res.end();
  });

  router.get('*', handleUnknown);

  return router;
}

function _initServer(conf) {
  var app = express();

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  app.use(
    '/graphql',
    [bodyParser.json(),
    function(req, res, next) {

      let md5 = require('crypto').createHash('md5').update(JSON.stringify(req.body) + (new Date()).getTime()).digest("hex");
      req.md5Hash = md5;
      req.statistics = {
        startedAt: new Date(),
        totalDBRequests: 0,
        totalDBTime: 1,
        totalDBTimeString: function() {
          return '' + (this.totalDBTime / 1000) + ' seconds';
        },
        totalProcessTime: 1,
        totalProcessTimeString: function() {
          return '' + (this.totalProcessTime / 1000) + ' seconds';
        },
        totalRequestTime: function() {
          return (this.startedAt.getTime() - (new Date()).getTime());
        },
        totalRequestTimeString: function() {
          return '' + (this.totalRequestTime / 1000) + ' seconds';
        }
      };
      console.log('\x1b[32m[GraphQL::' + md5 + ']\x1b[0m: Started request');
      res.on('finish', function() {
        let endedAt = new Date();
        let diff =  (endedAt.getTime() - this.startedAt.getTime()) / 1000;
        console.log('\x1b[32m[GraphQL::' + md5 + ']\x1b[0m: Ended request. Took \x1b[35m' + diff + '\x1b[0m seconds');
      }.bind({startedAt: new Date()}));
      next();
    }],
    graphqlExpress(req => {
      return {
        schema: conf.graphQLSchema,
        context: {
          api: conf.getApi,
          request: req,
          loaders: createDataLoaders(conf.getApi)
        }
      }
    })
  );

  app.use('/graphiql', graphiqlExpress({endpointURL: '/graphql', pretty: true }));
  app.use('/rest', restRouter(express.Router(), Configuration.getModuleConfiguration('infosystem.rest')));
  app.use('/couchdb', proxyRouter(express.Router(), Configuration.getModuleConfiguration('couchDBProxy'), 'couchdb'));
  app.use('*', miscRoutes(express.Router()));

  return new Promise((resolve, reject) => {
    app.listen(PORT, function() {
      console.log('HTTP server listening to port: ' + PORT);
      resolve(app);
    });
  });
}

export default _initServer;
