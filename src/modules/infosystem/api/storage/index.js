import mandatoryFunctionParameter from './../../../../lib/isql/utils/mandatoryFunctionParameter';
import md5 from './../../../../lib/isql/utils/md5';
import CouchDBAccess from './CouchDBAccess';
import nano from 'nano';
import Promise from 'bluebird';

const _connections = {};

function _initStorage({name, url = mandatoryFunctionParameter('url', 'CouchDBAccess::constructor'), username = '', password = '', collection = mandatoryFunctionParameter('collection', 'CouchDBAccess::constructor') }) {
  name = name  || md5(url, username, password, collection);

  let connection = Promise.promisifyAll(nano(url).use(collection));
  let db = new CouchDBAccess(connection);

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