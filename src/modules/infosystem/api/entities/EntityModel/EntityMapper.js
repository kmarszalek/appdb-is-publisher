import _ from 'lodash';
import {
  DEFAULT_DB_LIMIT,
  DEFAULT_DB_FIELDS,
  DEFAULT_MODEL_FINDMANY_ARGUMENTS,
  DEFAULT_MODEL_FINDONE_ARGUMENTS,
  DEFAULT_ARRAY_OPERATOR_MAP,
  DEFAULT_OPERATOR_MAP
} from './EntityDefaults';

const _createMappedOperator = (opVal) => (_.isFunction(opVal) ? opVal : (value) => { return {[opVal]: value}; });
const _createMappedProperty = (propVal) => (_.isFunction(propVal) ? propVal : () => propVal);
const _mappedOperationSetter = (mapped, val, key) => { mapped[key] = _createMappedOperator(val); };
const _mappedPropertySetter = (mapped, val, key) => { mapped[key] = _createMappedProperty(val); };
const _mappedFieldSetter = (mapped, val, key) => (mapped[(_.isFunction(val) ? val() : val)] = () => key);

const _compileOperatorMap = (ops) => _.transform(ops, _mappedOperationSetter, {});
const _compilePropertyMap = (props) => _.transform(props, _mappedPropertySetter, {});
const _compileFieldMap = (props) => _.transform(props, _mappedFieldSetter, {});

/**
 * Creates and returns a transpiler that takes a filter object as a parameters and returns
 * the equivelant mango selector to use in a couchDB instance.
 *
 * @param   {Object}    obj                 Configuration to use from transpiler
 * @param   {Object}    obj.properties      Mapped properties from DB to schema
 * @param   {Object}    obj.operators       Scalar operators. Eg. eq, lt, ne etc
 * @param   {Object}    obj.arrayOperators  Array operators. Eg or, and, in etc
 *
 * @returns {Function}              A function to transpile filter to mango selector
 */
const _createMangoSelectorTranspiler = ({properties = {}, operators = {}, arrayOperators = {}} = {}) => {
  const _filterApplyOperator = (key, val, filter) => {
    //console.log('Apply operator ['+ key + '] >>> ', (operators[key]) ? operators[key](val) : '<<nothing>>');
    if (key in operators) {
      delete filter[key];
      _.transform(operators[key](val) || {}, (selector, val, key) => {selector[key] = val;}, filter);

      return true;
    }

    return false;
  };

  const _filterApplyArrayOperator = (key, val, filter) => {
    val = val || [];
    val = Array.isArray(val) ? val : [val];

    if (_.isArray(val) && key in arrayOperators) {
      //console.log('Apply array operator ['+ key + '] >>> ', (arrayOperators[key]) ? arrayOperators[key](val) : '<<nothing>>');
      delete filter[key];
      val = val.map(_transpile);
      _.transform(arrayOperators[key](val) || {}, (selector, val, key) => {selector[key] = val;}, filter);

      return true;
    }

    return false;
  };

  const _hasOperators = (val) => {
    let vkeys = _.keys(val);
    let okeys = _.keys(operators);
    let akeys = _.keys(arrayOperators);
    let res = _.intersection(vkeys, akeys).length;
    if (res > 0) {
      return true;
    }

    res = _.intersection(vkeys, okeys).length
    return (res > 0);
  };

  const _extractComplexProperties = (val, key) => {
    if (!_.isPlainObject(val) || _hasOperators(val)) {
      return val;
    }
    let res = _.reduce(val, (acc, v, k) => {
      let ckey = key + '.' + k;
      if (ckey in properties) {
        if (_.isPlainObject(v) && !_hasOperators(v)) {
          acc =  _extractComplexProperties(v, ckey);
        } else {
          acc[ckey] = _extractComplexProperties(v, ckey);
        }
      }
      return acc;
    }, {});

    return res;
  };

  const _applyComplexFilterProperties = (val, key, filter = {}) => {
    if (!_.isPlainObject(val) || _hasOperators(val)) {
      return filter;
    }
    let exprops = _extractComplexProperties(val, key);
    if (_.keys(exprops).length) {
      delete filter[key];
      _.transform(exprops, (mapped, v, k) => {
        filter[k] = v;
      }, filter)
    }
    return filter;
  };
  const _applyFilterComplexFilterProperties = (filter) => {
    return _.transform(filter, (mapped, val, key) => {
      _applyComplexFilterProperties(val, key, mapped);
    }, filter);
  }

  const _filterApplyProperty = (key, val, filter) => {
    if (key in properties) {
      delete filter[key];

      if (_.isPlainObject(val)) {
        filter[properties[key]()] = _transpile(val);
      } else {
        filter[properties[key]()] = {'$eq': val};
      }

      return true;
    }

    return false;
  };

  const _transpile = (filter) => {
    if (_.isPlainObject(filter)) {
      filter = _applyFilterComplexFilterProperties(filter);
      return _.transform(filter, (selector, val, key) => {
        _filterApplyProperty(key, val, selector) ||
                _filterApplyArrayOperator(key, val, selector) ||
                _filterApplyOperator(key, val, selector);

      }, filter || {});
    } else if (_.isArray(filter)) {
      return filter.map(f => _transpile(f));
    } else {
      return filter;
    }
  };

  return (filter) => _transpile(filter);
};

/**
 * Creates a function to transpile external ordering schema (eg. name_asc, age_desc) to
 * valid DB sorting query field.
 *
 * @param {*} param0
 */
const _createMangoSortTranspiler = ({properties}) => {
  const rx = new RegExp("^([a-zA-Z][a-zA-Z0-9]+)(_asc|_desc){0,1}$");

  const _transpile = (sort = []) => {
    sort = Array.isArray(sort) ? sort: [sort];

    return sort
      .filter(_.trim) //exclude empty
      .map(f => rx.exec('' + f)) // match valid sorting fields
      .filter(x => !!x) //reject unmatched
      .map(x => { return {field: x[1], direction:x[2] || 'asc'}; }) //normalize results
      .map(x => { //transform results to valid mango sort item
        x.direction = x.direction.replace('_', '');
        x.field = (x.field in properties) ? properties[x.field]() : x.field;

        return {
          [x.field]: x.direction
        };
      });
  };

  return _transpile;
};

/**
 * Create a function to transpile given external schema fields to DB fields
 *
 * @param {*} param0
 */
const _createMangoFieldsTranspiler = ({properties, includeDBFields = [], excludeFields = []}) => {
  const _extractObjectProperties = () => {
    return _.keys(properties)
      .filter(k => k.indexOf('.') > -1)
      .reduce((acc, key) => {
        let current = '';
        let names = key.split('.');
        let name = names.shift();
        while(name) {
          if (names.length > 0) {
            current += (current) ? '.' + name : name;
            acc[current] = acc[current] || [];
            acc[current].push(properties[key]());
          }
          name = names.shift();
        }
        return acc;
      }, {});

  };
  const _complexProperties = _extractObjectProperties();
  const _validateFields = (fields) => ((fields.length) ? _.uniq(fields) :  (DEFAULT_DB_FIELDS || []));
  const _includeBaseFields = (fields) => {
    return includeDBFields.reduce((sum, inc) => {
      if (fields.indexOf(inc) === -1) {
        fields.push(inc);
      }
      return fields;
    }, fields);
  };

  const _excludeFields = (fields) => {
    return fields.filter(f => excludeFields.indexOf(f) === -1);
  };

  const _transpile = (fields) => {
    fields = Array.isArray(fields) ? fields : [fields];
    fields = _excludeFields(fields);


    fields = fields.reduce((acc, f) => {
        if(f in properties) {
          acc.push(properties[f]());
        } else if (f in _complexProperties) {
          acc = acc.concat(_complexProperties[f]);
        }
        return acc;
      }, []).filter(f => !!f)

    return _validateFields(_includeBaseFields(fields));
  };

  return _transpile;
};

const _createDocumentFieldsTranspiler = ({fields}) => {
  const _transpile = (doc) => {
    doc = doc || {};
    let res = _.transform(fields, (mapped, val, key) => {
      if (_.has(mapped, key)) {
        let docval = _.get(mapped, key);
        _.unset(mapped, key);
        let fval = val();
        if (fval.indexOf('.') > -1) {
          _.set(mapped, fval, docval);
        } else {
          mapped[fval] = docval;
        }
      }
    }, doc || {});
    return res;
  };

  return _transpile;
};

/**
 * Creates a model data mapper to generate DB queries from external query schema
 *
 * @param {*} param0
 */
function _createMapper(modelName, {baseFilter = {}, baseFields = [], propertyMap = {}, operatorMap = DEFAULT_OPERATOR_MAP, arrayOperatorMap = DEFAULT_ARRAY_OPERATOR_MAP, relationMap = {}} = {}) {
  const _operatorMapper = _compileOperatorMap(operatorMap);
  const _arrayOperatorMapper = _compileOperatorMap(arrayOperatorMap);
  const _propertyMapper = _compilePropertyMap(propertyMap);
  const _fieldMapper = _compileFieldMap(propertyMap);
  const _mangoSelectorTranspiler = _createMangoSelectorTranspiler({properties: _propertyMapper, operators: _operatorMapper, arrayOperators: _arrayOperatorMapper});
  const _mangoSortTranspiler = _createMangoSortTranspiler({properties: _propertyMapper});
  const _mangoFieldsTranspiler = _createMangoFieldsTranspiler({properties: _propertyMapper, includeDBFields: baseFields, excludeFields: Object.keys(relationMap)});
  const _documentFieldsTranspiler = _createDocumentFieldsTranspiler({fields: _fieldMapper});
  const _relationKeys = Object.keys(relationMap);

  const _getMangoQuery = ({filter = {}, skip = 0, limit = DEFAULT_DB_LIMIT, sort = [], fields = []} = {}, includeAll = true) => {
    let query = {
      selector: {..._mangoSelectorTranspiler(filter), ..._mangoSelectorTranspiler(baseFilter)},
      limit: limit,
      skip: skip,
      sort: _mangoSortTranspiler(sort),
      fields: _mangoFieldsTranspiler(fields)
    };

    if (query.fields.length === 0) {
      delete query.fields;
    }

    if (!includeAll) {
      delete query.limit;
      delete query.skip;
      delete query.sort;
    }

    return query;
  };

  const _getPropertiesFromFields = (doc) => _documentFieldsTranspiler(doc);
  const _getRelationMap = () => Object.assign({}, relationMap || {});
  const _getIdentifierField = () => {
    if (_.isFunction(_propertyMapper['id'])) {
      return _propertyMapper['id']();
    }
    return null;
  };

  const _getIdentifierProperty = () => {
    if (_.isFunction(_propertyMapper['id']) && _.isFunction(_fieldMapper[_propertyMapper['id']()])) {
      return _fieldMapper[_propertyMapper['id']()]();
    }
    return null;
  };

  return {
    getQuery: _getMangoQuery,
    getPropertyMapper: () => _propertyMapper,
    getOperatorMapper: () => _operatorMapper,
    getArrayOperatorMapper: () => _arrayOperatorMapper,
    getPropertiesFromFields: _getPropertiesFromFields,
    getRelationMap: _getRelationMap,
    getIdentifierField: _getIdentifierField,
    getIdentifierProperty: _getIdentifierProperty
  };
};

export const createEntityMapper = _createMapper;

export default {
  create: _createMapper
};