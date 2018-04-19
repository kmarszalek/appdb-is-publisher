export const EXECUTION_PLAN_STEP_TYPE = {
  INIT: 'INIT',
  //Perform DB query
  FETCH: 'FETCH',
  //Reduce results based by intersection of previous and current results
  REDUCE: 'REDUCE',
  //Collect remaining documents by their ids
  COLLECT: 'COLLECT'
};

export const EXECUTION_PLAN_OPERATION_TYPE = {
  AND: 'AND',
  OR: 'OR', //not applicable yet
  NONE: 'NONE' //just fetch
};

export const EXECUTION_PLAN_OPERATE_ON = {
  //Perform reduction against first query results
  ROOT: 'ROOT',
  PARENT: 'PARENT',
  PREVIOUS: 'PREVIOUS',
  //Do not perform reduction
  NONE: 'NONE'
};

export default {
  EXECUTION_PLAN_STEP_TYPE,
  EXECUTION_PLAN_OPERATION_TYPE,
  EXECUTION_PLAN_OPERATE_ON
};