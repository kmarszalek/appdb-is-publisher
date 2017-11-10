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
import ExecutionPlanner from './ExecutionPlanner';

function logger(title, message, context) {
  let md5 = _.get(context, 'request.md5Hash', '');
  md5 = (md5) ? '::' + md5 : '';
  let prefix = '\x1b[32m[GraphQL' + md5 + ']\x1b[0m';
  console.log(prefix + '\x1b[36m[ExecutionEngine('+ title + ')]\x1b[0m: ' + message);
}

function _createExecutionEngine({modelName, dbConnection, mapper}) {
  let _execPlanner = ExecutionPlanner.create({modelName, mapper});
  let _execModel = null;
  let _getModel = () => {
    if (!_execModel) {
      _execModel = EntityModelRegistry.get(modelName);
    }
    return _execModel;
  };

  function _executeQuery({filter, limit, skip, sort, fields, includeTotalCount, translateProperties = false, wrapItemsToCollection= false, nestedLevel}, context) {
    let plan = null;
    if (_execPlanner.needsPlanning(filter)) {
      plan = _execPlanner.createPlan({filter, limit, skip, sort, fields, includeTotalCount, translateProperties, wrapItemsToCollection, nestedLevel}, context);
      return _executePlan(plan);
    }
    if (nestedLevel === 0) {
      logger(modelName, 'FETCH ' + JSON.stringify(filter), context);
      return _getModel().fetchMany({filter, limit, skip, sort, fields, includeTotalCount: includeTotalCount, translateProperties: true, wrapItemsToCollection:true, nestedLevel}, context);
    }
    return _getModel().fetchMany({filter, limit, skip, sort, fields, includeTotalCount: false, translateProperties:false, wrapItemsToCollection:false, nestedLevel}, context);
  }

  function initializeStep(step, level, plan) {
    step.model = EntityModelRegistry.get(step.name);
    step.query = Object.assign({}, step.query || {}, {translateProperties: false, includeTotalCount: false, nestedLevel: level});
    step.context = plan.context;

    return step;
  }
  function _initializeExecutionPlan(plan) {
    plan.steps = plan.steps || {};
    plan.steps = Object.keys(plan.steps).reduce((acc, k) => {
      if (Array.isArray(plan.steps[k])) {
        acc[k] = plan.steps[k].map(step => initializeStep(step, plan.level + 1, plan));
      }else {
        acc[k] = initializeStep(plan.steps[k], plan.level, plan);
      }

      return acc;
    }, plan.steps);

    plan.model = EntityModelRegistry.get(plan.name);
    plan.query = Object.assign({}, plan.query, {nestedLevel: plan.level});
    return plan;
  }

  function prepareStepMap(map, initialData) {
    let q = {};
    if (initialData !== null) {
      q[map.relations.foreignKey] = {$in: _.map(initialData, (v) => _.get(v, map.relations.key))};
    }
    map.query.translateProperties = false;
    map.query.wrapItemsToCollection = false;
    map.query.filter = Object.assign({}, map.query.filter || {}, q);

    return map;
  }

  function execStepMap(map, nestedLevel) {
    let qq = Object.assign({}, map.query || {});
    qq.translateProperties = false;
    qq.wrapItemsToCollection = false;
    qq.nestedLevel = nestedLevel;

    return map.model.findMany(qq, map.context).then(results => {
      results = results || [];
      results = results.items || results;
      logger(map.name + '.' + nestedLevel, 'MAPPED ' + results.length + ' ITEMS ' + JSON.stringify(qq.filter), map.context);
      return Promise.resolve(results);
    });
  }

  function reduceMapResults(map, rootData) {
    let q = {};

    if (rootData !== null) {
      let mapResults = map.results || [];
      let mappedData = mapResults.map(d => {
        return {[map.relations.key]: _.get(d, map.relations.foreignKey)};
      });
      return _.intersectionBy(rootData, mappedData, map.relations.key);
    }

    return rootData;
  }
  function getExecutionResults(plan, collection = [], totalCount = 0) {
    if (plan.nestedLevel > 0) {
      return collection;
    }
    plan.initialRequest = plan.initialRequest || {};
    return {
      totalCount  : totalCount || collection.length || 0,
      count       : collection.length || 0,
      skip        : plan.initialRequest.skip || 0,
      limit       : plan.initialRequest.limit || 0,
      sort        : plan.initialRequest.sort || [],
      filter      : plan.initialRequest.filter || {},
      items       : collection || []
    };
  }

  async function _executePlan(plan) {
    logger(modelName + '.' + plan.level, 'START EXECUTION....', plan.context);
    plan = _initializeExecutionPlan(plan);
    logger(modelName+'.' + plan.level, 'INITED PLAN', plan.context);
    let rootData = null;

    if (plan.steps.init) {
      logger(modelName+'.' + plan.level , 'PERFORM INIT STEP ' +  JSON.stringify(plan.steps.init.query), plan.context);
      plan.steps.init.query.translateProperties = false;
      plan.steps.init.query.wrapItemsToCollection = false;
      rootData = await plan.steps.init.model.fetchMany(plan.steps.init.query, plan.context);
      rootData = rootData.items || rootData;
      if (rootData.length === 0) {
        console.log('\x1b[36m[ExecutionEngine('+modelName+'.' + plan.level + ')]\x1b[0m: NOTHING RETURNED');
        return getExecutionResults(plan);
      }
    }
    let reducedData = rootData;
    if (plan.steps.maps.length > 0) {
      logger(modelName + '.' + plan.level, 'PERFORM ' + plan.steps.maps.length  + ' MAP STEPS', plan.context);
      let mapPromises = (plan.steps.maps || []).map(m => {
        m = prepareStepMap(m, rootData);
        return execStepMap(m, plan.level + 1).then(results => {
          results = results || [];
          m.results = (results.items) ? results.items : results;
          m.results = m.results || [];
          return Promise.resolve(m);
        });
      });

      let mapResults = await Promise.all(mapPromises);
      let mapSuccess = mapResults.reduce((sum, v) => {
        if (v.results.length === 0) {
          sum = false;
        }
        return sum;
      }, true);
      logger(modelName + '.' + plan.level, 'MAP STEPS ENDED ' + (mapSuccess ? ' SUCCESSFULLY' : ' WITH NO RESULTS') , plan.context);

      if (mapSuccess === false) {
        return getExecutionResults(plan);
      }

      if (mapPromises.length > 0) {
        reducedData = mapResults.reduce((acc, mapResult) => reduceMapResults(mapResult, acc), rootData);
      }
    }

    logger(modelName + '.' + plan.level, 'REDUCTION DOWN TO ' + reducedData.length + ' ' + _.trim(modelName).toUpperCase() + ' ITEMS', plan.context);

    let rootTotalCount = 0;
    let rootCollection = [];

    if (reducedData.length === 0) {
      return getExecutionResults(plan, rootCollection, rootTotalCount);
    } else if (plan.level >  0) {
      rootCollection = reducedData || [];
    } else {
      let rootIds = reducedData.map(d => d._id);
      let rootRequest = Object.assign({}, plan.initialRequest || {});

      rootRequest.filter = {_id: {$in: rootIds}};
      rootRequest.wrapItemsToCollection = false;
      rootRequest.translateProperties = true;
      rootRequest.fields = plan.initialRequest.fields;
      rootRequest.sort = plan.initialRequest.sort;
      rootRequest.limit = plan.initialRequest.limit;
      rootRequest.skip = plan.initialRequest.skip;

      rootCollection = await plan.model.fetchMany(rootRequest, plan.context);
    }

    let execResults = getExecutionResults(plan, rootCollection, rootTotalCount);
    logger(modelName + '.' + plan.level, 'PLAN FINISHED WITH ' + _.get(execResults, 'items', []).map(item => item.id).join(', '), plan.context);
    return execResults;
  }



  return {
    needsPlanning: _execPlanner.needsPlanning,
    prepareQuery: _execPlanner.createPlan,
    executeQuery: _executeQuery,
    executePlan: _executePlan
  };
}

export default {
  create: _createExecutionEngine
}