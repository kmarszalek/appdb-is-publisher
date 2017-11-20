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
import EntityModelRegistry from './EntityModelRegistry';

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

function _createExecutionPlanner({modelName, mapper}) {
  const relationMap = getNormalizedRelationMap(mapper);//.getRelationMap();
  const _relationKeys = _.keys(relationMap);

  const _needsPlanning = (filter) => {
    return _seperateFilterRelations(filter).hasExternal;
  };

  const _optimizeSharedFields = (res) => {
    // OPTIMIZATION: Add filtering to root entity for shared fields
    // and remove them from extrnal entity filtering.
    // If no external filtering is left, remove it all together.
    // eg. In a siteservice filtetin the site.name does not need to be filtered
    // as an external site entity since this information is already contained
    // in the siteservice itself.
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

  const _createQueryDescription = ({
    name = modelName,
    stepType = EXECUTION_PLAN_STEP_TYPE.INIT,
    operationType = EXECUTION_PLAN_OPERATION_TYPE.NONE,
    operateOn = EXECUTION_PLAN_OPERATE_ON.NONE,
    query = {},
    relations = null,
    relationType = null
  } = {
    name: modelName,
    stepType: EXECUTION_PLAN_STEP_TYPE.INIT,
    operationType: EXECUTION_PLAN_OPERATION_TYPE.NONE,
    operateOn: EXECUTION_PLAN_OPERATE_ON.NONE,
    query: {},
    relations:  null,
    relationType: null
  }) => {

    let descr = {
      name,
      stepType,
      operationType,
      operateOn,
      query
    };

    if (relations) {
      descr.relations = relations;
      descr.relationType = relationType
    }

    return descr;
  };

  const _createQueryPlan = ({filter = {}, skip = 0, limit = DEFAULT_DB_LIMIT, sort = [], fields = [], nestedLevel = 0} = {}, context) => {
    let sepFilter = _seperateFilterRelations(filter);
    let queryDescriptions = [];
    let primaryKeys = ['id'];

    if (!sepFilter.hasExternal) {
      return [
        _createQueryDescription({query: {filter, skip, limit, sort, fields}})
      ];
    }

    primaryKeys = _.reduce(relationMap, (acc, val, key) => {
      acc = acc.concat(_.keys((val || {}).keys || {}));
      return _.uniq(acc);
    }, primaryKeys);

    let init = _createQueryDescription({
      stepType: EXECUTION_PLAN_STEP_TYPE.INIT,
      operationType: EXECUTION_PLAN_OPERATION_TYPE.NONE,
      operationOn: EXECUTION_PLAN_OPERATE_ON.NONE,
      query: {filter: sepFilter.internal, fields: primaryKeys},
    });

    let maps = _.reduce(sepFilter.external, (acc, val, key) => {
      let rmap = relationMap[key] || {};
      let rmodelName = rmap.name;
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

  return {
    createPlan: _createQueryPlan,
    needsPlanning: _needsPlanning
  }
}

export const ExecutionPlanner = {
  create: _createExecutionPlanner
}

export default ExecutionPlanner;