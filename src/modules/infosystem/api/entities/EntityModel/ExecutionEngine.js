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

/**
 * Create an Execution Engine instance for the given model.
 *
 * @param   {object} args               Execution Engine parameters
 * @param   {object} args.modelName     Model registered name.
 * @param   {object} args.mapper        Model mapper.
 *
 * @returns {object}                    Execution Engine api.
 */
function _createExecutionEngine({modelName, mapper}) {
  let _execPlanner = ExecutionPlanner.create({modelName, mapper});
  let _execModel = null;
  let _getModel = () => {
    if (!_execModel) {
      _execModel = EntityModelRegistry.get(modelName);
    }
    return _execModel;
  };

  /**
   * Executes given query.
   *
   * It checks if the given query needs to be performed in multiple steps.
   * If it does not it just performs it though the model, else it creates
   * a plan and starts its execution.
   *
   * @param   {object} query      Model query.
   * @param   {object} context    Request context.
   * @returns {Promise}           Resolves list of model objects.
   */
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

  /**
   * Normalizes and injects the given step with model and context.
   *
   * @param   {object} step   Execution step.
   * @param   {number} level  Nesting level.
   * @param   {object} plan   Execution plan.
   *
   * @returns {object}        Execution step.
   */
  function initializeStep(step, level, plan) {
    step.model = EntityModelRegistry.get(step.name);
    step.query = Object.assign({}, step.query || {}, {translateProperties: false, includeTotalCount: false, nestedLevel: level});
    step.context = plan.context;

    return step;
  }

  /**
   * Normalize and initializes plan.
   *
   * @param   {object} plan   Execution plan.
   * @returns {object}        Normalized execution plan.
   */
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

  /**
   * Prepare step query.
   *
   * @param   {object}    map         Execution step.
   * @param   {object[]}  initialData The root query results.
   *
   * @returns {object}                Prepared execution step.
   */
  function prepareStepMap(map, initialData) {
    let q = {};

    if (initialData !== null) {
      q[map.relations.foreignKey] = {$in: _.uniq(_.map(initialData, (v) => _.get(v, map.relations.key)))};
      //OPTIMIZATION: Do not perform $in operation for single items
      q[map.relations.foreignKey] = (q[map.relations.foreignKey].$in.length === 1) ? {$eq: q[map.relations.foreignKey].$in[0]} : q[map.relations.foreignKey];
    }

    map.query.translateProperties = false;
    map.query.wrapItemsToCollection = false;
    map.query.filter = Object.assign({}, map.query.filter || {}, q);

    return map;
  }

  /**
   * Perform execution step query.
   *
   * @param   {object}  map         Execution step.
   * @param   {number}  nestedLevel Current nesting level.
   * @returns {Promise}             Resolves query results.
   */
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

  /**
   * Reduce init step results from map step results.
   *
   * @param   {object}    map       Execution step of type "map".
   * @param   {object[]}  rootData  Results from execution step of type "init"
   *
   * @returns {object[]}            Intersected results.
   */
  function reduceMapResults(map, rootData) {
    let q = {};

    if (rootData !== null) {
      let mapResults = map.results || [];
      let mappedData = [];
      let mapPKey = _.get(map, 'relations.key');
      let mapFKey = _.get(map, 'relations.foreignKey');

      if (map.relationType === 'belongsTo') {
        mappedData = mapResults.map(d => {
          return _.get(d, mapFKey);
        });

        return rootData.reduce((acc, val) => {
          if ( mappedData.indexOf(_.get(val, mapFKey)) > -1 ) {
            acc.push(val);
          }
          return acc;
        }, []);

      } else {
        mappedData = mapResults.map(d => {
          return {[mapPKey]: _.get(d, mapFKey)};
        });
        return _.intersectionBy(rootData, mappedData, map.relations.key);
      }
    }

    return rootData;
  }

  /**
   * Returns the execution plan's results. If this is
   * the root plan, it wraps the results as a collection with metadata.
   * If the results concern an inner execution plan, it just returns the
   * array of results to be used from the other steps.
   *
   * @param   {object}    plan        Execution Plan.
   * @param   {object[]}  collection  List of model objects(result).
   * @param   {number}    totalCount  The total count corresponding to its query.
   *
   * @returns {object}                Execution result.
   */
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

  /**
   * Start executing the given plan.
   *
   * @param   {object} plan Execution plan.
   *
   * @returns {Promise}     Resolves plan results.
   */
  async function _executePlan(plan) {
    logger(modelName + '.' + plan.level, 'START EXECUTION....', plan.context);
    plan = _initializeExecutionPlan(plan);

    let rootData = null;
    let rootIdentifier = _.get(plan, 'steps.init.identifier', '_id');
    let rootIdentifierProperty = _.get(plan, 'steps.init.identifierProperty', 'id');
    let reducedData = rootData;

    //Check if plan has an init step and performs tit first
    if (plan.steps.init) {
      logger(modelName+'.' + plan.level , 'PERFORM INIT STEP ' +  JSON.stringify(plan.steps.init.query), plan.context);

      //Set extra result wrapping to false to improve performance
      plan.steps.init.query.translateProperties = false;
      plan.steps.init.query.wrapItemsToCollection = false;

      //perform actual DB query
      rootData = await plan.steps.init.model.fetchMany(plan.steps.init.query, plan.context);
      rootData = rootData.items || rootData;

      //If nothing is fetched exit.
      if (rootData.length === 0) {
        console.log('\x1b[36m[ExecutionEngine('+modelName+'.' + plan.level + ')]\x1b[0m: NOTHING RETURNED');
        return getExecutionResults(plan);
      }
    }

    reducedData = rootData;

    //Check if there are any further steps and execute them.
    if (plan.steps.maps.length > 0) {
      logger(modelName + '.' + plan.level, 'PERFORM ' + plan.steps.maps.length  + ' MAP STEPS', plan.context);

      let mapPromises = (plan.steps.maps || []).map(m => {
        m = prepareStepMap(m, rootData);

        return execStepMap(m, plan.level + 1).then(results => {
          //Ensure results is an array
          results = results || [];
          m.results = (results.items) ? results.items : results;
          m.results = m.results || [];

          return Promise.resolve(m);
        });
      });

      //Wait for all steps to complete
      let mapResults = await Promise.all(mapPromises);

      //Check if at least one has results
      let mapSuccess = mapResults.reduce((sum, v) => {
        if (v.results.length === 0) {
          sum = false;
        }
        return sum;
      }, true);

      logger(modelName + '.' + plan.level, 'MAP STEPS ENDED ' + (mapSuccess ? ' SUCCESSFULLY' : ' WITH NO RESULTS') , plan.context);

      //If none of them have any results exit.
      if (mapSuccess === false) {
        return getExecutionResults(plan);
      }

      //Perform reduction
      if (mapPromises.length > 0) {
        reducedData = mapResults.reduce((acc, mapResult) => reduceMapResults(mapResult, acc), rootData);
      }
    }

    logger(modelName + '.' + plan.level, 'REDUCTION DOWN TO ' + reducedData.length + ' ' + _.trim(modelName).toUpperCase() + ' ITEMS', plan.context);

    let rootTotalCount = 0;
    let rootCollection = [];

    if (reducedData.length === 0) {
      //No reduced results. Just return.
      return getExecutionResults(plan, rootCollection, rootTotalCount);
    } else if (plan.level >  0) {
      //This is a nested query. do nothing.
      rootCollection = reducedData || [];
    } else {
      //Prepare final query based on the remained identifiers after the reduction.
      let rootIds = reducedData.map(d => _.get(d, rootIdentifier, d._id));
      let rootRequest = Object.assign({}, plan.initialRequest || {});

      rootRequest.filter = (rootIds.length === 1) ? _.set({}, `${rootIdentifier}.$eq`, rootIds[0]) : _.set({}, `${rootIdentifier}.$in`, rootIds);
      rootRequest.wrapItemsToCollection = false;
      rootRequest.translateProperties = true;
      rootRequest.fields = plan.initialRequest.fields;
      rootRequest.sort = plan.initialRequest.sort;
      rootRequest.limit = plan.initialRequest.limit;
      rootRequest.skip = plan.initialRequest.skip;

      rootCollection = await plan.model.fetchMany(rootRequest, plan.context);
    }

    //Prepare the results for return.
    let execResults = getExecutionResults(plan, rootCollection, rootTotalCount);

    logger(modelName + '.' + plan.level, 'PLAN FINISHED WITH ' + _.get(execResults, 'items', []).map(item => _.get(item, rootIdentifierProperty, JSON.stringify(item))).join(', '), plan.context);

    return execResults;
  }

  //Return ExecutionEngine public api functions.
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