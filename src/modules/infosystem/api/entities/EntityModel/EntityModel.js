import _ from 'lodash';
import EntityModelRegistry from './EntityModelRegistry';
import EntityMapper from './EntityMapper';
import ExecutionEngine from './ExecutionEngine';
import {
  DEFAULT_DB_LIMIT,
  DEFAULT_DB_FIELDS,
  DEFAULT_MODEL_FINDMANY_ARGUMENTS,
  DEFAULT_MODEL_FINDONE_ARGUMENTS,
  DEFAULT_ARRAY_OPERATOR_MAP,
  DEFAULT_OPERATOR_MAP
} from './EntityDefaults';


const _errorMandatoryField = (msg) => {
  return () => {
    throw new Error(msg);
  };
};

/**
 * Creates a model to perform queries based on the given parameters
 *
 * @param {*} param0
 */
const _createModel = (
  {
    //The name of the model
    name              = _errorMandatoryField('[InfoSystem:api:entities:createModel] Must give name when creating a model'),
    //The DB collection name to be used. Can be String or Function -> String
    dbName            = _errorMandatoryField('[InfoSystem:api:entities:createModel] Must give dbNameparameter when creating a model'),
    //Key-Value object where keys are the external data schema property names and values are the corresponding DB field names.
    //Values can be either String or Function -> String
    propertyMap       = {},
    //Key-Value object where keys are the external schema scalar operator names and values are the corresponfing DB (eg. mango) scalar operator names
    //Value can be either String or Function(v) -> Object(key->DB operator, value -> v ) Eg eq -> $eq, like -> (v) => {$regex: v}
    operatorMap       = DEFAULT_OPERATOR_MAP,
    //Key-Value object where keys are the external schema array operator names and values are the corresponfing DB (eg. mango) array operator names
    //Value can be either String or Function(v) -> Object(key->DB operator, value -> v ). Eg. in -> $in, contains -> (v) => {$in: v}
    arrayOperatorMap  = DEFAULT_ARRAY_OPERATOR_MAP,
    //Key-Value object where keys are the external schema model names and values are objects containing information about the relation.
    relationMap       = {},
    //Filtering object based on the external filtering schema to be applied to all DB queries performed by this model
    baseFilter        = {},
    //Always return the given fields
    baseFields        = [],
    //Always exclude these fields from DB results
    excludeFields     = [],
    //Custom processing of fecthed fields before exporting and/or translate them to properties
    postProcessFields = {},
    //The DB connection instance
    dbConnection      = _errorMandatoryField('[InfoSystem:api:entities:createModel] Must give DB connection object'),
  } = {}
) => {
  const _mapper = EntityMapper.create(name, {baseFilter, baseFields, propertyMap, operatorMap, arrayOperatorMap, relationMap});

  const _db = (_.isFunction(dbConnection)) ? dbConnection : () => dbConnection;

  const _execEngine = ExecutionEngine.create({modelName: name, dbConnection: _db, mapper: _mapper, relationMap});

  const _postProcessFieldNames = _.keys(postProcessFields).filter(p => _.isFunction(postProcessFields[p]));

  const _postDocumentFetch = (doc) => {
    return doc;
  };

  const _postProcessFields = (doc) => {
    return _.reduce(_postProcessFieldNames, (acc, name) => {
      if (_.has(doc, name)) {
        doc[name] = postProcessFields[name](_.get(doc, name), doc);
      }
      return doc;
    }, doc);
  }

  const _exportDocument = (doc) => {
    if (doc === null || doc.data === null) {
      return null;
    }
    return _postDocumentFetch(_mapper.getPropertiesFromFields(_postProcessFields(doc)));
  };

  const fetchMany = async ({filter = {}, skip, limit, sort = [], fields = [], includeTotalCount = false,translateProperties = true, wrapItemsToCollection= true} = DEFAULT_MODEL_FINDMANY_ARGUMENTS, context) => {
    let query = _mapper.getQuery({filter, limit, skip, sort, fields});
    //console.log(`[${name}] FIND MANY ` + JSON.stringify(filter));
    //console.log(`[${name}] QUERY MANY ` + JSON.stringify(query));
    let execQueries = await Promise.all([
      _db().findMany(query, context),
      ((includeTotalCount && wrapItemsToCollection) ? _db().findCount(query, context) : Promise.resolve(null))
    ]).then(vals => {
      return Promise.resolve({
        docs: (vals[0] || []).map((translateProperties) ? _exportDocument : (doc)=>doc),
        totalCount: vals[1]
      });
    });

    if (wrapItemsToCollection === false) {
      return Promise.resolve(execQueries.docs);
    }

    return Promise.resolve({
      totalCount: execQueries.totalCount,
      count: execQueries.docs.length,
      skip: skip || 0,
      limit: limit || 0,
      sort: sort || [],
      filter: filter || {},
      items: execQueries.docs
    });
  }

  const findOne = ({filter = {}, fields = DEFAULT_DB_FIELDS, translateProperties = true} = DEFAULT_MODEL_FINDONE_ARGUMENTS, context) => {
    let query = _mapper.getQuery({filter, limit: 1, skip: 0, fields});
    return _db().findOne(query, context).then(doc => ((translateProperties) ? _exportDocument(doc) : doc));
  }

  const findMany = ({filter = {}, skip, limit, sort = [], fields = [], includeTotalCount = false, translateProperties = true, wrapItemsToCollection = true, nestedLevel = 0} = DEFAULT_MODEL_FINDMANY_ARGUMENTS, context) => {
    /*if (_execEngine.needsPlanning(filter) === false) {
      return _findMany({filter, skip, limit, sort, fields, includeTotalCount, translateProperties}, context);
    }*/

    return _execEngine.executeQuery({filter, skip, limit, sort, fields, includeTotalCount, translateProperties, wrapItemsToCollection, nestedLevel}, context);
  }

  const getById = (id, context) => {
    return _db().getById(id, context).then(doc => Promise.resolve(_exportDocument(doc)));
  };

  const getCount = ({filter = {}} = DEFAULT_MODEL_FINDONE_ARGUMENTS, context) => {
    let query = _mapper.getQuery({filter, fields: ['id']});

    return _db().findCount(query, context);
  }

  const hasOneEntry = ({filter = {}} = DEFAULT_MODEL_FINDONE_ARGUMENTS, context) => {
    let query = _mapper.getQuery({filter, limit: 2, skip: 0, fields: ['id']});
    return _db().findCount(query, context).then(count => (count === 1));
  };

  const hasSomeEntries = ({filter = {}} = DEFAULT_MODEL_FINDONE_ARGUMENTS, context) => {
    let query = _mapper.getQuery({filter, limit: 2, skip: 0, fields: ['id']});
    return _db().findCount(query, context).then(count => (count > 1));
  };

  const hasAny = ({filter = {}} = DEFAULT_MODEL_FINDONE_ARGUMENTS, context) => {
    let query = _mapper.getQuery({filter, limit: 1, skip: 0, fields: ['id']});
    return _db().findCount(query, context).then(count => (count > 0));
  };

  const hasNone = ({filter = {}} = DEFAULT_MODEL_FINDONE_ARGUMENTS, context) => {
    return !hasAny({filter}, comtext);
  };

  const _map = (data) => {
    data = data || [];
    data = Array.isArray(data) ? data : [data];

    return data.map(d => _exportDocument(d));
  };

  const _mapOne = (data, preprocessFunc) => {
    return _.first(_map(data)) || null;
  };

  const _modelOps = {
    findMany: findMany,
    findOne: findOne,
    getCount: getCount,
    getById: getById,
    hasAny: hasAny,
    hasNone: hasNone,
    hasOne: hasOneEntry,
    hasSome: hasSomeEntries,
    getMapper: () => _mapper,
    fetchMany: fetchMany,
    getExecutionEngine: () => _execEngine,
    map: _map,
    mapOne: _mapOne

  };

  EntityModelRegistry.register(name, _modelOps);

  return _modelOps;
};

export const createEntityModel = _createModel;

export default {
  create: _createModel
}