
import mandatoryFunctionParameter from './../../../../lib/isql/utils/mandatoryFunctionParameter.js';
import md5 from './../../../../lib/isql/utils/md5.js';
import nano from 'nano';
import _ from 'lodash';
import DataLoader from 'dataloader';
import UniqueTaskRegistry from './../../../../lib/isql/utils/UniqueTaskRegistry';

const _DEFAULT_LIMIT_VALUE = 1000;

const _MAX_LIMIT_VALUE = 1000000000;

const _allowedMangoProps = [
  'selector',
  'fields',
  'limit',
  'skip',
  'sort'
];

function normalizeListArgs(args) {
  let normArgs = Object.assign({
    selector: {},
    limit: _DEFAULT_LIMIT_VALUE,
    skip: 0,
    fields: [],
    sort: []
  }, args || {});

  normArgs.selector = Object.assign({}, args.selector || args.filter || {});
  normArgs.limit = parseInt(args.limit) || 1000;
  normArgs.skip = parseInt(args.skip) || 0;

  normArgs.fields = args.fields || [];
  normArgs.fields = Array.isArray(normArgs.fields) ? normArgs.fields : [normArgs.fields];

  normArgs.sort = args.sort || [];
  normArgs.sort = Array.isArray(normArgs.sort) ? normArgs.sort : [normArgs.sort];
  normArgs.sort = normArgs.sort.filter(v => !!v).map(v => ((_.isString(v)) ? {[v]: 'asc'} : v));

  if (normArgs.sort.length === 0) {
    delete normArgs.sort;
  }

  if (normArgs.fields.length === 0) {
    delete normArgs.fields;
  }

  //Clean invalid properties
  Object.keys(normArgs).forEach(k => {
    if (_allowedMangoProps.indexOf(k) === -1) {
      delete normArgs[k];
    }
  });

  return normArgs;
}

function getInfoResult(doc) {
  doc = doc || {};

  let res = Object.assign({}, doc.info || {}, {id: doc._id});

  return res;
}

function logger(title, message, context, results) {
  let md5 = _.get(context, 'request.md5Hash', '');
  md5 = (md5) ? '::' + md5 : '';
  results = (results) ? '\x1b[33m[' + results + ']' : '';
  let prefix = '\x1b[32m[GraphQL' + md5 +']\x1b[0m';
  console.log(prefix + '\x1b[34m[CouchDBAccess::' + title + ']' + results + '\x1b[0m: ' + message);
}

function errorLogger(title, message, context) {
  let md5 = _.get(context, 'request.md5Hash', '');
  md5 = (md5) ? '::' + md5 : '';
  console.log('\x1b[37m\x1b[41m[ERROR]\x1b[0m\x1b[34m[CouchDBAccess' + md5 + '::' + title + ']\x1b[0m: ' + message);
}

class CouchDBAccess {
  constructor(db, name) {
    this._db  = db;
    this._name = name;
    this._taskRegistry = new UniqueTaskRegistry(this._name, {cacheResponseTime: 10000});
  }

  queryTask(name, query) {
    var func =this._db[name];
    var id = this._name + '::' + name + '(' + (_.isPlainObject(query) ? JSON.stringify(query) : query) + ')';

    return this._taskRegistry.register(id, function __queryTaskCaller__() { return func(query); });
  }

  _cacheDb(context) {
    let _db = this;
    if (!context.filterLoader) {
      context.filterLoader = {
        findOne: new DataLoader(queries => Promise.all(queries.map(q => _db._findOne(JSON.parse(q), context)))),
        findMany: new DataLoader(queries => Promise.all(queries.map(q => _db._findMany(JSON.parse(q), context)))),
        findCount: new DataLoader(queries => Promise.all(queries.map(q => _db._findCount(JSON.parse(q), context)))),
        getById: new DataLoader(ids => Promise.all(ids.map(id => _db._getById(id, context))))
      };
    }

    return {
      findOne: (query) => context.filterLoader.findOne.load(JSON.stringify(query)),
      findMany: (query) => context.filterLoader.findMany.load(JSON.stringify(query)),
      findCount: (query) => context.filterLoader.findCount.load(JSON.stringify(query)),
      getById: (id) => context.filterLoader.getById.load(id)
    }
  }

  _findOne(args, context) {
    let query = normalizeListArgs(args);
    let queryTask = null;

    //Optimization: Do not perform query if 'id' field is given
    //Instead just retrieve document by ID.
    if (_.trim(_.get(args, 'id', null))) {
      queryTask = this.queryTask('get', args.id);
    } else {
      queryTask = this.queryTask('findAsync', query);
    }

    return queryTask.then(result => {
      let docs = result.docs || [];
      docs = Array.isArray(docs) ? docs : [docs];
      logger('findOne', JSON.stringify(args), context, (docs.length > 0));
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return _.first(docs) || null;
    }).catch(err => {
      console.log('ERROR MESSAGE:' ,err.message);
      errorLogger('findOne', Object.toString(err), context);
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return Promise.reject(err);
    });
  }

  findOne(args, context) {
    return this._cacheDb(context).findOne(args);
  }

  _findCount(args, context) {
    let query = normalizeListArgs(args);

    query.limit = _MAX_LIMIT_VALUE;
    query.skip = 0;
    query.fields = ['_id'];

    return this.queryTask('findAsync',query).then(result => {
      let docs = result.docs || [];
      docs = Array.isArray(docs) ? docs : [docs];
      logger('findCount', JSON.stringify(args), context, docs.length);
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return docs.length;
    }).catch(err => {
      console.log('ERROR MESSAGE:' ,err.message);
      errorLogger('findCount', Object.toString(err));
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return Promise.reject(err);
    });
  }

  findCount(args, context) {
    return this._cacheDb(context).findCount(args);
  }

  _findMany(args, context) {
    let query = normalizeListArgs(args);

    return this.queryTask('findAsync', query).then(result => {
      logger('findMany', JSON.stringify(args), context, _.trim(result.docs.length));
      let docs = result.docs || [];
      docs = Array.isArray(docs) ? docs : [docs];
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return docs;
    }).catch(err => {
      console.log('ERROR MESSAGE:' ,err.message);
      errorLogger('findMany', Object.toString(err), context);
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return Promise.reject(err);
    });
  }

  findMany(args, context) {
    return this._cacheDb(context).findMany(args);
  }

  getIds(args, context, useIdField = '_id') {
    let query = normalizeListArgs(args);

    query.fields = [useIdField];
    delete query.limit;
    delete query.skip;
    delete query.sort;

    return this.queryTask('findAsync', query).then(result => {
      logger('getIds', JSON.stringify(args), _.trim(results.docs.length));
      let docs = result.docs || [];
      docs = Array.isArray(docs) ? docs : [docs];
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return _.map(docs, (v) => v._id);
    }).catch(err => {
      console.log('ERROR MESSAGE:' ,err.message);
      console.log('[ERROR] CouchDBAccess::getIds ', JSON.stringify(args), Object.toString(err));
      _.set(context, 'request.statistics.totalDBRequests', _.get(context, 'request.statistics.totalDBRequests', 0) + 1);
      return Promise.reject(err);
    });
  }

  _getById(id, context) {
    return this.queryTask('getAsync', id).catch(err => {
        switch(err.message) {
          case 'missing':
            return Promise.resolve({data: null});
        }
        return Promise.reject(err);
    });
  }

  getById(id, context) {
    return this._cacheDb(context).getById(id);
  }
}

export default CouchDBAccess;
