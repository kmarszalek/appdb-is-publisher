import proxy from 'http-proxy-middleware';
import util from 'util';
import bodyParser from 'body-parser';
import jp from 'jsonpath';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import createLogger from './logger';

export const expressRouter = function (router, config, routerPath = '') {
  var logger = createLogger(config);
  // proxy middleware options
  var options = {
    // target url
    target: config.target.protocol + '://' + config.target.host + ':' + config.target.port,
    // needed for virtual hosted sites
    changeOrigin: true,
    // proxy websockets
    ws: true,
    secure: false,
    // Url path rewrite to ensure correct proxying
    pathRewrite: {
      //do not allow reader to visit couchdb _utils
      ['^/' + routerPath + '/\\_utils/'] : '/___NO_DB___',
      //do not allow reader to visit couchdb _utils
      ['^/' + routerPath + '/\\_utils'] : '/___NO_DB___',
      // do not pass the local couchdb router path to the remote one
      ['^/' + routerPath + '/'] : '/',
      // do not pass the local couchdb router path to the remote one
      ['^/' + routerPath] : '/',
    },
    onError(err, req, res) {
      res.end({'error': { 'message': 'Something went wrong. And we are reporting a custom error message.', 'details': '' + err}});
      let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      logger.error('[' + ip + '][ERROR]', err);
    },
    onProxyReq(proxyReq, req, res) {
      let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let body = req.body;
      let auth = new Buffer(config.target.username + ':' + config.target.password).toString('base64');
      let strBody = JSON.stringify(body) || '';

      proxyReq.setHeader( 'authorization', 'Basic ' + auth );
      proxyReq.setHeader( 'content-type', 'application/json' );
      proxyReq.setHeader( 'content-length', strBody.length );
      proxyReq.write(strBody);
//    proxyReq.end();

      logger.info('['+ip+']', req.method + ' ' + proxyReq.path + ' ' + strBody);
    }
  };

  // create the proxy (without context)
  router.all('*', proxy(options));

  return router;
};
