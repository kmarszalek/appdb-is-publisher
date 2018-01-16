import _ from 'lodash';
const DEFAULT_INDENT_SPACES = 2;
const ENUM_PREFIX = '$ENUM_';
const getIndent= (level, spaces = DEFAULT_INDENT_SPACES)  => {
  return _.times(level * spaces, _.constant(' ')).join('');
};

export const filterToGraphQL = (filter, level = 0) => {
  let itemCount = 0;

  if (_.isString(filter)) {
    let parsedFilter = parseFilterString(filter);

    if (parsedFilter.errors.length) {
      throw new Error(parsedFilter.errors[0]);
    }
    filter = parsedFilter.filter;
  }

  return _.reduce(filter, (acc, val, key) => {
    if (itemCount > 0) {
      acc += ', ';
    }

    acc += getIndent(level) + key.replace(ENUM_PREFIX, '') + ': ';
    if (_.isPlainObject(val)) {
      acc += filterToGraphQL(val, level + 1);
    } else if (_.isString(val)) {
      if (key.indexOf(ENUM_PREFIX) === 0) {
        acc += val;
      } else {
        acc += '"' + val + '"';
      }

    } else {
      acc += val;
    }

    itemCount +=1;

    return acc;
  }, getIndent(level) + '{\n') + getIndent(level) + '\n}';
};

export const asyncFilterToGraphQL = (filter) => {
  return new Promise((resolve, reject) => {
    try {
      resolve(filterToGraphQL(filter));
    } catch (e) {
      reject(e);
    }
  });
}

export const resultHandlerByPath = (path, defaultResult = {data: null}) => {
  let alias = _.trim(path).split(' as ');
  if (alias.length > 1) {
    path = _.trim(alias[0]);
    alias = _.trim(alias[1]);
  } else {
    alias = false;
  }

  return (doc) => {
    let result = _.get(doc, path, null);
    if (alias) {
      result = {[alias]: result};
    }
    return Promise.resolve(result || defaultResult);
  };
};

const _FilterExpressions = [
  {
    name: 'text',
    expr: /([a-zA-z\_][a-zA-Z0-9\_]*[\.[a-zA-Z0-9]*)(\:\:\w+)?\:\"([a-zA-Z0-9\s\*\!\@\#\$\%\^\&\*\(\)\_\-\+\=\~\\\|\{\}\[\]\;\'\:\,\>\.\>\/\?]*)*\"/g,
    ops: ['eq', 'ne', 'like', 'ilike', 'nlike', 'nilike'],
    noop: (value) => ((_.trim(value).indexOf('*') > -1) ? 'like' : 'eq'),
    getValue: (value) => _.trim(value)
  },
  {
    name: 'integer',
    expr: /([a-zA-z\_][a-zA-Z0-9\_]*[\.[a-zA-Z0-9]*)(\:\:\w+)?\:([-+]?\d+)/g,
    ops: ['eq', 'ne', 'gt', 'lt', 'ge', 'le'],
    noop: (value) => 'eq',
    getValue: (value) => parseInt(value || '0')
  },
  {
    name: 'float',
    expr: /([a-zA-z\_][a-zA-Z0-9\_]*[\.[a-zA-Z0-9]*)(\:\:\w+)?\:([-+]?[0-9]*\.?[0-9]+)/g,
    ops: ['eq', 'ne', 'gt', 'lt', 'ge', 'le'],
    noop: (value) => 'eq',
    getValue: (value) => parseFloat(value || '0.0')
  },
  {
    name: 'boolean',
    expr: /([a-zA-z\_][a-zA-Z0-9\_]*[\.[a-zA-Z0-9]*)(\:\:\w+)?\:(true|True|TRUE|false|False|FALSE)/g,
    ops: [],
    noop: (value) => null,
    getValue: (value) => (value.toLowerCase() === 'true')
  },
  {
    name: 'enum',
    expr: /([a-zA-z\_][a-zA-Z0-9\_]*[\.[a-zA-Z0-9]*)(\:\:\w+)?\:([a-zA-Z0-9]*)/g,
    ops: ['eq', 'ne', 'oneof'],
    noop: (value) => 'eq',
    getValue: (value) => _.trim(value),
    getOp: (op, value) => ENUM_PREFIX + op
  }
];

export const parseFilterString = (query) => {
  if (_.isPlainObject(query)) {
    return {filter: query, errors: []};
  }

  if (!_.isString(query)) {
    return {
      filter: query,
      errors: ['Invalid filter string given']
    };
  }

  try {
    let filter = JSON.parse(query);

    return {
      filter,
      errors: []
    };
  } catch (e) {}

  let parseResults = _.reduce(_FilterExpressions, (acc, filterExpr) => {
    let match = null;
    let found = [];

    while (match = filterExpr.expr.exec(_.trim(acc.initial))) {
      let fullPath = '';

      //Extract foundings
      let path = _.trim(match[1]);
      let op = _.trim((match[2] || '').replace('::', '')).toLowerCase();
      let value = filterExpr.getValue(_.trim(match[3]));

      if (!op) {
        op = filterExpr.noop(value);
      }

      if (op && filterExpr.ops.indexOf(op) === -1) {
        let validOps = filterExpr.ops.join(', ');
        if (validOps.length) {
          validOps = `Supported operators are ${validOps}.`;
        } else {
          validOps = `The property does not support any operator.`;
        }
        acc.errors.push(`Setting "${path}" filter property as "${filterExpr.name}" value with invalid operator "${op}". ${validOps}`);
      } else {
        if (_.isFunction(filterExpr.getOp)) {
          op = filterExpr.getOp(op, value);
        }
        op = (op) ? `.${op}` : '';
        let fltObj = _.set({}, `${path}${op}`, value);
        acc.filter = _.merge(acc.filter, fltObj);
      }

      //Save current founding to be removed later from query string
      found.push(match[0]);
    }

    //Clear initial query string
    _.each(found, (v) => {
      while(acc.initial.indexOf(v) > -1) {
        acc.initial = _.trim(acc.initial.replace(v, ''));
      }
    });

    filterExpr.expr.lastIndex = 0;

    return acc;
  }, {initial: query ,filter: {}, errors: []});

  if (_.trim(parseResults.initial) !== '') {
    parseResults.errors.push('Cannot parse all of the filter string. Unknown filter "' + _.trim(parseResults.initial) + '".');
  }

  return {
    filter: parseResults.filter,
    errors: parseResults.errors
  };
};