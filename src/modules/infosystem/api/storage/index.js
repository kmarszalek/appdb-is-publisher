import mandatoryFunctionParameter from './../../../../lib/isql/utils/mandatoryFunctionParameter';
import md5 from './../../../../lib/isql/utils/md5';
import CouchDBAccess from './CouchDBAccess';
import nano from 'nano';
import Promise from 'bluebird';
var http = require('http');
var https = require('https');
http.globalAgent.maxSockets = 300;
https.globalAgent.maxSockets = 300;

const _connections = {};

/**
 * Initialize the storage access object.
 *
 * @param   {object} config             The access configuration.
 * @param   {string} config.name        Name to give to the storage acccess. Usually same as accesed collection.
 * @param   {string} config.url         Couchdb url endpoint.
 * @param   {string} config.username    Couchdb account username.
 * @param   {string} config.password    Couchdb account password.
 * @param   {string} config.collection  Couchdb collection name.
 *
 * @returns {CouchDBAccess}             CouchDBAccess instance.
 */
function _initStorage({name, url = mandatoryFunctionParameter('url', 'CouchDBAccess::constructor'), username = '', password = '', collection = mandatoryFunctionParameter('collection', 'CouchDBAccess::constructor') }) {
  name = name  || md5(url, username, password, collection);

  let nanoConnection = nano({url, "requestDefaults" : { "agent" : false }});
  let nanoCollection = nanoConnection.use(collection);
  let connection = Promise.promisifyAll(nanoCollection);
  let db = new CouchDBAccess(connection, name);

  return Promise.resolve(db).then((db) => {
    if (name in _connections) {
      delete _connections[name];
    }

    _connections[name] = {
      name: name,
      db: db
    };

    return Promise.resolve(db);
  });
}

export default {
  init: _initStorage
}