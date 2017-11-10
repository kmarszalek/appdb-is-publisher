import _ from 'lodash';
const DEFAULT_INDENT_SPACES = 2;

const getIndent= (level, spaces = DEFAULT_INDENT_SPACES)  => {
  return _.times(level * spaces, _.constant(' '));
};

export const filterToGraphQL = (filter, level = 0) => {
  let itemCount = 0;
  return _.reduce(filter, (acc, val, key) => {
    if (itemCount > 0) {
      acc += ', ';
    }

    acc += getIndent(level) + key + ': ';
    if (_.isPlainObject(val)) {
      acc += filterToString(val, level + 1);
    } else if (_.isString(val)) {
      acc += '"' + val + '"';
    } else {
      acc += val;
    }

    return acc;
  }, getIndent(level) + '{\n') + getIndent(level) + '\n}';
};

export const resultHandlerByPath = (path, defaultResult = {data: null}) => {
  return (doc) => {
    let result = _.get(doc, path, null);
    return Promise.resolve(result || defaultResult);
  };
};


const queryToFilter = (query) => {
  let qs = /\w+\:\w+\(\'?\w+\'?\)|\w+\:\w+|\w+\:\'(\s|\w|(\\'))*\'/g.exec(query);
  if (!qs) {
    return {};
  }
  let items = [];
  let maxQueries = 100;
  while(qs && maxQueries) {
    items.push(qs[1]);
    query = query.replace(qs[1], '').trim();
    qs = /\w+\:\w+\(\'?\w+\'?\)|\w+\:\w+|\w+\:\'(\s|\w|(\\'))*\'/g.exec(query);
    maxQueries -= 1;
  }

  items = items.map(item => {
    let val = /\w+\:\'(\s|\w|(\\'))*\'/.exec(item);
    val = val || /\w+\:\w+/.exec


  });




}