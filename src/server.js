import express from 'express';
import url from 'url';
import Configuration from './lib/isql/Configuration';
import bodyParser from 'body-parser';
import { ApolloServer } from 'apollo-server-express';
import { express as voyagerExpress } from 'graphql-voyager/middleware';
import graphiqlExpress from 'express-graphiql-middleware';
import DataLoader from 'dataloader';
import {serviceDescription as graphqlServiceDescription} from './modules/infosystem/graphql';
import {expressRouter as restRouter, handleNoImlementation, handleUnknown, serviceDescription as restServiceDescription} from './modules/infosystem/rest';
import {expressRouter as proxyRouter} from './modules/couchDBProxy';
import http from 'http';
import https from 'https';

http.globalAgent.maxSockets = 2000;
https.globalAgent.maxSockets = 2000;

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

const graphqlMiddleware_Headers = function(conf) {
  return function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', 'content-type, authorization, content-length, x-requested-with, accept, origin');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      res.end();
    } else {
      next();
    }
  };
};

const graphqlMiddleware_Metrics = function(conf) {
  return function(req, res, next) {
    let logger = conf.getLogger('graphql');
    let md5 = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(req.body) + (new Date()).getTime())
      .digest("hex");

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
  };
};

/**
 * Initialize HTTP server. Setup routes to inner services
 * @param {*} conf
 */
function _initServer(conf) {
  const GRAPHQL_ENTPOINT_PATH = '/graphql';

  const app = express();

  const graphQLConfig = conf.getGraphQL();

  const graphQLServer = new ApolloServer({
    schema: graphQLConfig.getSchema(),
    context: ({ req }) => ({
      api: conf.getApi,
      request: req,
      loaders: createDataLoaders(conf.getApi)
    }),
    introspection: true,
    playground: {
      endpoint: GRAPHQL_ENTPOINT_PATH,
      theme: 'dark'
    }
  });

  const graphQLEndpoint = app.use(
    GRAPHQL_ENTPOINT_PATH,
    [
      bodyParser.json(),
      graphqlMiddleware_Headers(conf),
      graphqlMiddleware_Metrics(conf)
    ]
  );

  graphQLServer.applyMiddleware({
    app: graphQLEndpoint,
    path: GRAPHQL_ENTPOINT_PATH
  });

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  //Setup Graphiql tool endpoint to perform graphql queries in the browser
  //app.use('/tools/graphiql',graphiqlExpress({endpointURL: '/graphql', pretty: true }));
  app.get('/tools/graphiql', graphiqlExpress({ endpointURL: GRAPHQL_ENTPOINT_PATH, rewriteURL: true }));

  //Setup voyager tool endpoint to graphicaly display graphql schema in the browser
  app.use('/tools/voyager', voyagerExpress({ endpointUrl: GRAPHQL_ENTPOINT_PATH, displayOptions: {sortByAlphabet: true} }));

  //Graphiql used to be a root route. Now is moved to /tools location. Redirect older external links.
  app.use('/graphiql', (req, res) => res.redirect(
    url.format({
      pathname: '/tools/graphiql',
      query: req.query
    })
  ));

  // Setup a REST api interface on top of graphql
  app.use('/rest', restRouter(express.Router(), Configuration.getModuleConfiguration('infosystem.rest')));

  // Setup a proxy to the CouchDB backend instance
  app.use('/couchdb', proxyRouter(express.Router(), Configuration.getModuleConfiguration('couchDBProxy'), 'couchdb'));

  // Handle any other route
  app.use('*', miscRoutes(express.Router()));

  //Start server. Listening to configured port.
  return new Promise((resolve, reject) => {
    app.listen(PORT, function() {
      console.log('HTTP server listening to port: ' + PORT);
      resolve(app);
    });
  });
}

export default _initServer;
