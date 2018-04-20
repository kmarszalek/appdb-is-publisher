
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

/**
 * Normalizes given mango query arguments.
 *
 * @param {object}      args            Mango query arguments.
 * @param {object}      args.selector   Mango filter object.
 * @param {number}      args.limit      Limit query results.
 * @param {number}      args.skip       Query offset.
 * @param {string[]}    args.fields     Array if document fields to return.
 * @param {object[]}    args.sort       Array of sorting results.
 *
 * @returns {object}                    Normalized mango query object.
 */
function normalizeListArgs(args) {
  let normArgs = Object.assign({
    selector: {},
    limit: _DEFAULT_LIMIT_VALUE,
    skip: 0,
    fields: [],
    sort: []
  }, args || {});

  //Ensure selector attribute is not null
  normArgs.selector = Object.assign({}, args.selector || args.filter || {});

  //Ensure limit attribute is a number
  normArgs.limit = parseInt(args.limit) || 1000;

  //Ensure skip attribute is a number
  normArgs.skip = parseInt(args.skip) || 0;

  //Ensure fields attribute is an array
  normArgs.fields = args.fields || [];
  normArgs.fields = Array.isArray(normArgs.fields) ? normArgs.fields : [normArgs.fields];

  //Ensure sort attribute is an array
  normArgs.sort = args.sort || [];
  normArgs.sort = Array.isArray(normArgs.sort) ? normArgs.sort : [normArgs.sort];
  normArgs.sort = normArgs.sort.filter(v => !!v).map(v => ((_.isString(v)) ? {[v]: 'asc'} : v));

  if (normArgs.sort.length === 0) {
    delete normArgs.sort;
  }

  if (normArgs.fields.length === 0) {
    delete normArgs.fields;
  }

  //Clear invalid properties
  Object.keys(normArgs).forEach(k => {
    if (_allowedMangoProps.indexOf(k) === -1) {
      delete normArgs[k];
    }
  });

  return normArgs;
}

/**
 * Get only the document data and omit the metadata section.
 *
 * NOTE: IsCollector stores each documents with two sections.
 * The info section that contains the actual data and the metadata section
 * that conatins information avout the data harvest and references
 * to other other document types.
 *
 * @param   {object} doc  Couchdb document object.
 * @returns {object}
 */
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

/**
 * Provides mechanism to access information of a CouchDB endpoint
 * produced by the IsCollector process
 */
class CouchDBAccess {
  /**
   * Constuctor.
   *
   * @param {object} db     A couchdb connection. Most likely a promisified instance from "nano" package.
   * @param {string} name   Connection name. Usually the name of the accessed couchdb collection.
   */
  constructor(db, name) {
    this._db  = db;
    this._name = name;
    this._taskRegistry = new UniqueTaskRegistry(this._name, {cacheResponseTime: 10000});
  }

  /**
   * Get a named query task.
   *
   * @param {string} name   Query operation (get, findAsync, findCount etc)
   * @param {object} query  A mango query to be performed.
   *
   * @returns {Promise}     Resolves the query results
   */
  queryTask(name, query) {
    var func =this._db[name];
    var id = this._name + '::' + name + '(' + (_.isPlainObject(query) ? JSON.stringify(query) : query) + ')';

    return this._taskRegistry.register(id, function __queryTaskCaller__() { return func(query); });
  }

  /**
   * Returns a cached DB api for a given context to decrease resource consumption and improve performance.
   *
   * NOTE: This cache layer is created to be used for queries of the same request context.
   * If for example a user requests (eg REST API request) information that resolves to multiple queries,
   * this layer ensures that already retrieved information won't be requested again from the backend
   * couch db instance.
   *
   * @param   {object} context  The context to attache the cached DB api
   * @returns {object}          Cached DB api (provides operations findOne, findMany, findCount and getById)
   */
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

  /**
   * Returns the first document for the given mango query.
   *
   * @param   {object} args     Mango query.
   * @param   {object} context  Request context.
   *
   * @returns {Promise}         Resolves a CouchDB document
   */
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

  /**
   * [CACHED] Returns the first document for the given mango query.
   *
   * @param   {object} args     Mango query.
   * @param   {object} context  Request context.
   *
   * @returns {Promise}         Resolves a CouchDB document
   */
  findOne(args, context) {
    return this._cacheDb(context).findOne(args);
  }

  /**
   * Returns the count for the given query.
   *
   * @param   {object} args     Mango query.
   * @param   {object} context  Request context.
   *
   * @returns {Promise}         Resolves the count (number)
   */
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

  /**
   * [CACHED] Returns the count for the given query.
   *
   * @param   {object} args     Mango query.
   * @param   {object} context  Request context.
   *
   * @returns {Promise}         Resolves the count (number)
   */
  findCount(args, context) {
    return this._cacheDb(context).findCount(args);
  }

  /**
   * Returns the documents for the given query.
   *
   * @param   {object} args     Mango query.
   * @param   {object} context  Request context.
   *
   * @returns {Promise}         Resolves the list of documents.
   */
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

  /**
   * [CACHED] Returns the documents for the given query.
   *
   * @param   {object} args     Mango query.
   * @param   {object} context  Request context.
   *
   * @returns {Promise}         Resolves the list of documents.
   */
  findMany(args, context) {
    return this._cacheDb(context).findMany(args);
  }

  /**
   * Returns a list of IDs for the qiven query.
   *
   * @param   {object} args         Mango query.
   * @param   {object} context      Request context.
   * @param   {string} useIdField   Optional. The document field to return as ID.
   *
   * @returns {Promise}             Resolves a list of document IDs
   */
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

  /**
   * Returns a document for the qiven document ID.
   *
   * @param   {string} id           CouchDB document _id.
   * @param   {object} context      Request context.
   *
   * @returns {Promise}             Resolves a document object.
   */
  _getById(id, context) {
    return this.queryTask('getAsync', id).catch(err => {
        switch(err.message) {
          case 'missing':
            return Promise.resolve({data: null});
        }
        return Promise.reject(err);
    });
  }

  /**
   * [CACHED] Returns a document for the qiven document ID.
   *
   * @param   {string} id           CouchDB document _id.
   * @param   {object} context      Request context.
   *
   * @returns {Promise}             Resolves a document object.
   */
  getById(id, context) {
    return this._cacheDb(context).getById(id);
  }
}

export default CouchDBAccess;
