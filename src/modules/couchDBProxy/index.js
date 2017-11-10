import proxy from 'http-proxy-middleware';
import util from 'util';
import bodyParser from 'body-parser';
import jp from 'jsonpath';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import createLogger from './logger';

function procResBody(req, res, next) {
  let responseWrite = res.write.bind(res);
  let responseEnd = res.end.bind(res);
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  let orig_body = '';

  const concatResBody = function (chunk) {
    orig_body += Buffer.concat((chunk) ? [chunk] : []);
  };

  res.write = concatResBody;

  res.end = function (chunk) {
    concatResBody(chunk);
    let body = {};

    if (  req.body &&
          req.method == "POST" &&
          typeof req.mangoQueryFields !== 'undefined' &&
          req.mangoQueryFields
    ) {
        let fields = (req.mangoQueryFields).map((x) => '$.docs[*].'+x.replace(/\.\[\]/g, '[*]'))

        for(let field of fields) {
          logger.info('['+ip+']','Processing field: '+ field);

          try {
            let paths = jp.nodes(JSON.parse(orig_body), field);

            for(let i = 0; i < paths.length; i++) {
              let path = jp.stringify(paths[i].path).replace(/\$\./g, '');
              _.set(body, paths[i].path, paths[i].value);
            }
          } catch(err) {
            logger.error('['+ip+']', err);
          }
        }

        body = (body.$) ? Buffer.from( JSON.stringify(body.$) || '', 'utf-8' ) : orig_body;
    } else {
      body = orig_body;
    }

    responseWrite(body);
    responseEnd();
  };

  next();
}

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
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.end('Something went wrong. And we are reporting a custom error message.' + err);
    },
    onProxyReq(proxyReq, req, res) {
      let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let body = req.body;

      if ( req.method == "POST" && req.body && typeof req.query.strict !== 'undefined') {
        req.mangoQueryFields = body.fields;
        delete body.fields;
      }

      // Update header
      let auth = new Buffer(config.target.username + ':' + config.target.password).toString('base64');
      let strBody = JSON.stringify(body) || '';

      proxyReq.setHeader( 'authorization', 'Basic ' + auth );
      proxyReq.setHeader( 'content-type', 'application/json' );
      proxyReq.setHeader( 'content-length', strBody.length );
      proxyReq.write(strBody);
      proxyReq.end();

      logger.info('['+ip+']', req.method + ' ' + proxyReq.path);
    }
  };

  // create the proxy (without context)
  router.get('*', [procResBody], proxy(options));

  return router;
};
