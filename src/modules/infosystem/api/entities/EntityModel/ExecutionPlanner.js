import _ from 'lodash';
import {
  DEFAULT_DB_LIMIT,
  DEFAULT_DB_FIELDS,
  DEFAULT_MODEL_FINDMANY_ARGUMENTS,
  DEFAULT_MODEL_FINDONE_ARGUMENTS,
  DEFAULT_ARRAY_OPERATOR_MAP,
  DEFAULT_OPERATOR_MAP
} from './EntityDefaults';
import {
  EXECUTION_PLAN_STEP_TYPE,
  EXECUTION_PLAN_OPERATION_TYPE,
  EXECUTION_PLAN_OPERATE_ON
} from './ExecutionPlanEnums';

/**
 * Normalize relation map of given entity model mapper.
 *
 * @param   {object} mapper Entity model mapper instance.
 *
 * @returns {object}        Entity model mapper instance.
 */
function getNormalizedRelationMap(mapper) {
  let res = {};

  if (mapper && mapper.getRelationMap) {
    res = mapper.getRelationMap();
    res = Object.keys(res).reduce((acc, key) => {
      acc[key] = acc[key] || {};
      acc[key].relationType = acc[key].relationType || 'none';
      acc[key].relationOn = acc[key].relationOn || {};
      acc[key].sharedFields = acc[key].sharedFields || {};
      acc[key].hasSharedFields = (Object.keys(acc[key].sharedFields).length > 0)
      return acc;
    }, res);
  }

  return res;
}

/**
 * Create an execution planner for given entity model name and entity mapper instance.
 *
 * @param   {object} args             Arguments object.
 * @param   {object} args.modelName   Entity model name.
 * @param   {object} args.mapper      Entity model mapper.
 *
 * @returns {object}                  Execution Planner Api.
 */
function _createExecutionPlanner({modelName, mapper}) {
  const relationMap = getNormalizedRelationMap(mapper);
  const _relationKeys = _.keys(relationMap);

  /**
   * Checks if given query filter needs multiple queries
   * to be performed, thus needs planning.
   *
   * @param   {object}  filter  Entity model query filter.
   * @returns {boolean}         True, if given filter need planning.
   */
  const _needsPlanning = (filter) => {
    return _seperateFilterRelations(filter).hasExternal;
  };

  /**
   * Optimization to reduce filtering if external referenced fields are already present
   * in the internal model.(To be used by _seperateFilterRelations)
   *
   * Add filtering to root entity for shared fields
   * and remove them from external entity filtering.
   * If no external filtering is left, remove it all together.
   * eg. In a siteservice filter in the site.name does not need to be filtered
   * as an external site entity since this information is already contained
   * in the siteservice itself.
   *
   * @param   {object} res
   * @returns {object}
   */
  const _optimizeSharedFields = (res) => {
    if (res.hasExternal === true) {
      res.external = _.reduce(res.external, (acc, filterVal, filterKey) => {
        let rel = relationMap[filterKey] || {};
        if ( rel.hasSharedFields && _.isPlainObject(filterVal) ) {
          let newFilterObj = Object.keys(filterVal).reduce((o, key, index) => {
            if (_.has(rel.sharedFields, key)) {
              let newKey = _.get(rel.sharedFields, key);
              let tmp = _.set({}, newKey, filterVal[key]);
              o = _.merge(o, tmp);
              delete filterVal[key];
            }

            return o
          }, {});

          if (Object.keys(newFilterObj).length > 0) {
            res.internal = res.internal || {};
            res.internal = _.merge(res.internal, newFilterObj);
          }

          if (Object.keys(filterVal).length === 0) {
            delete acc[filterKey];
          } else {
            acc[filterKey] = filterVal;
          }
        }

        return acc;
      }, res.external);

      if (Object.keys(res.external).length === 0) {
        res.hasExternal = false;
      }

      if (res.hasInternal === false && Object.keys(res.internal || {}).length > 0) {
        res.hasInternal = true;
      }
    }

    return res;
  };

  /**
   * Seperate which filter keys reference fields of external models.
   *
   * @param   {object} filter Model filter
   * @returns {object}        Object containing external and internal filter expressions.
   */
  const _seperateFilterRelations = (filter) => {
    let res =  _.reduce(filter, (acc, filterVal, filterKey) => {
      if (_relationKeys.indexOf(filterKey) > -1) {
        acc.external = _.merge(acc.external, {[filterKey]: filterVal});
        acc.hasExternal = true;
      } else {
        acc.internal = _.merge(acc.internal, {[filterKey]: filterVal});
        acc.hasInternal = true;
      }
      return acc;
    }, {
      external: {},
      internal: {},
      hasExternal: false,
      hasInternal: false
    });

    res = _optimizeSharedFields(res);

    return res;
  }

  /**
   * Create a query description object.
   *
   * @param   {object} args                     Arguments object.
   * @param   {string} args.name                Entity model name.
   * @param   {string} args.stepType            Enumeration of EXECUTION_PLAN_STEP_TYPE.
   * @param   {string} args.operationType       Enumeration of EXECUTION_PLAN_OPERATION_TYPE.
   * @param   {string} args.operateOn           Enumeration of EXECUTION_PLAN_OPERATE_ON.
   * @param   {object} args.query               Entity model query object.
   * @param   {object} args.relations           Key/foreign key of entity model relation to other model.
   * @param   {object} args.relationType        Entity model relation type to other model (belongsTo, hasMany, hasOne etx)
   * @param   {string} args.identifier          DB document identifier field name.
   * @param   {string} args.identifierProperty  Entity model identifier property name.
   *
   * @returns {object}                          Query step description object.
   */
  const _createQueryDescription = ({
    name = modelName,
    stepType = EXECUTION_PLAN_STEP_TYPE.INIT,
    operationType = EXECUTION_PLAN_OPERATION_TYPE.NONE,
    operateOn = EXECUTION_PLAN_OPERATE_ON.NONE,
    query = {},
    relations = null,
    relationType = null,
    identifier = '_id',
    identifierProperty = 'id'
  } = {
    name: modelName,
    stepType: EXECUTION_PLAN_STEP_TYPE.INIT,
    operationType: EXECUTION_PLAN_OPERATION_TYPE.NONE,
    operateOn: EXECUTION_PLAN_OPERATE_ON.NONE,
    query: {},
    relations:  null,
    relationType: null,
    identifier: '_id',
    identifierProperty: 'id'
  }) => {

    let descr = {
      name,
      stepType,
      operationType,
      operateOn,
      query,
      identifier,
      identifierProperty
    };

    if (relations) {
      descr.relations = relations;
      descr.relationType = relationType
    }

    return descr;
  };

  /**
   * Create an execution plan for the given query.
   *
   * If the query filter does not reference other document
   * types it will not perform any extra steps. The description
   * is meant to be used by the execution engine.
   *
   * @param   {object}    query                         Model query.
   * @param   {object}    query.filter                  Optional. Model filter. Default {}.
   * @param   {number}    query.skip                    Optional. Model skip(offset) entries. Default 0.
   * @param   {number}    query.limit                   Optional. Model limit results. Default DEFAULT_DB_LIMIT.
   * @param   {object[]}  query.sort                    Optional. Array of sort property objects. Default [].
   * @param   {object[]}  query.fields                  Optional. Array of properties to retrieve. Default [].
   * @param   {number}    query.nestedLevel             Optional. Used from ExecutionEngine to track down the documents join level. Default 0
   * @param   {object}    context                       Request context.
   *
   * @returns {object}                                  Execution plan.
   */
  const _createQueryPlan = ({filter = {}, skip = 0, limit = DEFAULT_DB_LIMIT, sort = [], fields = [], nestedLevel = 0} = {}, context) => {
    let sepFilter = _seperateFilterRelations(filter);
    let queryDescriptions = [];
    let primaryKeys = ['id'];

    if (!sepFilter.hasExternal) {
      return [
        _createQueryDescription({query: {filter, skip, limit, sort, fields}})
      ];
    }

    //Collect all of the ID fields needed to perform the queries
    primaryKeys = _.reduce(relationMap, (acc, val, key) => {
      acc = acc.concat(_.keys((val || {}).keys || {}));
      return _.uniq(acc);
    }, primaryKeys);

    //Create first query to execute
    let init = _createQueryDescription({
      stepType: EXECUTION_PLAN_STEP_TYPE.INIT,
      operationType: EXECUTION_PLAN_OPERATION_TYPE.NONE,
      operationOn: EXECUTION_PLAN_OPERATE_ON.NONE,
      query: {filter: sepFilter.internal, fields: primaryKeys},
      identifier: mapper.getIdentifierField(),
      identifierProperty: mapper.getIdentifierProperty()
    });

    //Generate external queries desciptions
    let maps = _.reduce(sepFilter.external, (acc, val, key) => {
      let rmap = relationMap[key] || {};
      let rmodelName = rmap.name;
      //Retrieve only the related identifiers from the query
      let fields = _.uniq(['id'].concat(_.values(rmap.keys)));
      let descr = _createQueryDescription({
        name: rmodelName,
        stepType: EXECUTION_PLAN_STEP_TYPE.MAP,
        operationType: EXECUTION_PLAN_OPERATION_TYPE.NONE,
        operateOn: EXECUTION_PLAN_OPERATE_ON.ROOT,
        relations: rmap.relationOn || {},
        relationType: rmap.relationType,
        query: {filter: val, fields: fields}
      });

      acc.push(descr);

      return acc;
    }, []);

    //Create final result reduction description
    let reduce = _createQueryDescription({
      name: modelName,
      stepType: EXECUTION_PLAN_STEP_TYPE.REDUCE,
      operationType: EXECUTION_PLAN_OPERATION_TYPE.AND,
      operateOn: EXECUTION_PLAN_OPERATE_ON.ROOT
    });

    return {
      name: modelName,
      level: nestedLevel,
      context,
      initialRequest: {
        filter,
        skip,
        limit,
        sort,
        fields
      },
      steps: {
        init,
        maps,
        reduce
      }
    };
  };

  //Return mapper api public functions.
  return {
    createPlan: _createQueryPlan,
    needsPlanning: _needsPlanning
  }
}

export const ExecutionPlanner = {
  create: _createExecutionPlanner
}

export default ExecutionPlanner;