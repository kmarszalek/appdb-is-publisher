import _ from 'lodash';
import {
  DEFAULT_DB_LIMIT,
  DEFAULT_DB_FIELDS,
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
 * @param   {Object}    obj                 Configuration to use from transpiler.
 * @param   {Object}    obj.properties      Mapped properties from DB to schema.
 * @param   {Object}    obj.operators       Scalar operators. Eg. eq, lt, ne etc.
 * @param   {Object}    obj.arrayOperators  Array operators. Eg or, and, in etc.
 *
 * @returns {Function}                      A function to transpile filter to mango selector.
 */
const _createMangoSelectorTranspiler = ({properties = {}, operators = {}, arrayOperators = {}} = {}) => {
  /**
   * Applies entity model property filter value comparison of filter to DB selector value comparison.
   * Eg {name: {ilike: '%a site name%'}} where name -> key
   *
   * @param   {string}  key       Filter model property name.
   * @param   {any}     val       Filter value of given property name.
   * @param   {object}  filter    Filter to apply transformation.
   *
   * @returns {boolean}           True, if the current key/value pair applies as a simple property equation.
   */
  const _filterApplyOperator = (key, val, filter) => {
    if (key in operators) {
      delete filter[key];
      _.transform(operators[key](val) || {}, (selector, val, key) => {selector[key] = val;}, filter);

      return true;
    }

    return false;
  };

  /**
   * Applies entity model property filter of array value to DB array selector.
   *
   * @param   {string}  key       Filter model property name.
   * @param   {any}     val       Filter value of given property name.
   * @param   {object}  filter    Filter to apply transformation.
   *
   * @returns {boolean}           True, if the current key/value pair applies as a simple property equation.
   */
  const _filterApplyArrayOperator = (key, val, filter) => {
    val = val || [];
    val = Array.isArray(val) ? val : [val];

    if (_.isArray(val) && key in arrayOperators) {
      delete filter[key];
      val = val.map(_transpile);
      _.transform(arrayOperators[key](val) || {}, (selector, val, key) => {selector[key] = val;}, filter);

      return true;
    }

    return false;
  };

  /**
   * Checks if given filter object contains comparison operations.
   *
   * @param   {object}  val   Model filter.
   *
   * @returns {boolean}       True, if contains comparisons.
   */
  const _hasOperators = (val) => {
    let vkeys = _.keys(val);
    let okeys = _.keys(operators);
    let akeys = _.keys(arrayOperators);
    let res   = _.intersection(vkeys, akeys).length;

    if (res > 0) {
      return true;
    }

    res = _.intersection(vkeys, okeys).length;

    return (res > 0);
  };

  /**
   * Walks down the value object until it finds a comparison operator
   * or scalar value and recursively flattens filter object.
   *
   * @param   {any}    val  Filter value to walk.
   * @param   {string} key  Filter key.
   *
   * @returns {any}         Filter object.
   */
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

  /**
   * Collect complex properties, flattens them and transforms filter object.
   *
   * @param   {any}     val     Filter value to check.
   * @param   {string}  key     Filter key.
   * @param   {object}  filter  Filter to check.
   *
   * @returns {object}          Applied filter object.
   */
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

  /**
   * Pass through all of filter's properties and apply
   * complex properties operations.
   *
   * @param   {object} filter Filter object to iterate.
   *
   * @returns {object}        Applied filter object.
   */
  const _applyFilterComplexFilterProperties = (filter) => {
    return _.transform(filter, (mapped, val, key) => {
      _applyComplexFilterProperties(val, key, mapped);
    }, filter);
  }

  /**
   * Applies entity model property filter equation of filter to DB selector equation.
   * If value is an object it recursivley calls _traspile.
   *
   * @param   {string}  key       Filter model property name.
   * @param   {any}     val       Filter value of given property name.
   * @param   {object}  filter    Filter to apply transformation.
   *
   * @returns {boolean}           True, if the current key/value pair applies as a simple property equation.
   */
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

  /**
   * Takes a entity model filter and transpile it to the DB selector equivalent.
   *
   * @param   {object} filter   Entity model filter object.
   *
   * @returns {object}          DB selector object.
   */
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
 * @param   {object}    args              Arguments object.
 * @param   {object}    args.properties   Model propertyMap.
 *
 * @returns {function}                    A function (propertySort: string[]) -> dbfieldSort:object[]
 */
const _createMangoSortTranspiler = ({properties}) => {
  /**
   * Matches model sorting syntax. Eg name_asc, name_desc.
   */
  const rx = new RegExp("^([a-zA-Z][a-zA-Z0-9]+)(_asc|_desc){0,1}$");

  /**
   * Take an array of model sorting commands and transpile it to DB sorting equivalent object array.
   *
   * @param   {string[]} sort   Entity model sorting array.
   *
   * @returns {object[]}        DB sortinng object array.
   */
  const _transpile = (sort = []) => {
    sort = Array.isArray(sort) ? sort: [sort];

    return sort
      .filter(_.trim)             //exclude empty
      .map(f => rx.exec('' + f))  // match valid sorting fields
      .filter(x => !!x)           //reject unmatched
      .map(x => {                 //normalize results
        return {
          field: x[1],
          direction:x[2] || 'asc'
        };
      })
      .map(x => {                 //transform results to valid mango sort item
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
 * @param {object}    args                  Arguments object.
 * @param {object}    args.properties       Entity model properties to transpile.
 * @param {string[]}  args.includeDBFields  Array of DB fields to always be included in the result.
 * @param {string[]}  args.excludeFields    Array of DB fields to always be excluded from the result.
 *
 * @returns {function}                      Function (string[]) -> string[]
 *
 */
const _createMangoFieldsTranspiler = ({properties, includeDBFields = [], excludeFields = []}) => {
  /**
   * Extracts complex properties as simple (flattened) properties object.
   *
   * NOTE: Any dot seperated model property name is considered to be a complex property.
   * Eg. In the model propertyMap definition if we have the following mappings
   *   {'location.id': 'a_db_field_name', 'location.country': 'another_db_field_name'}
   * the model should result to:
   *   {
   *      'location': {
   *        'id'     : '<a_db_field_value>',
   *        'country': '<another_db_field_value>'
   *      }
   *   }
   */
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

  /**
   * Store complex properties as they do not change.
   */
  const _complexProperties = _extractObjectProperties();

  /**
   * Remove diplicate DB field names fromthe given array of fields and in case of an empty array
   * return the default DB fields.
   *
   * @param   {string[]} fields   Array of DB field names.
   *
   * @returns {string[]}          Array of DB field names.
   */
  const _validateFields = (fields) => ((fields.length) ? _.uniq(fields) :  (DEFAULT_DB_FIELDS || []));

  /**
   * Ensure DB fields defined in includeDBFields parameter are included in the given fields array.
   *
   * @param   {string[]} fields   Array of field names.
   *
   * @returns {string[]}          Array of field names.
   */
  const _includeBaseFields = (fields) => {
    return includeDBFields.reduce((sum, inc) => {
      if (fields.indexOf(inc) === -1) {
        fields.push(inc);
      }
      return fields;
    }, fields);
  };

  /**
   * Filter out excluded DB fields from the given fields array.
   *
   * @param   {string[]} fields   Array of DB field names.
   *
   * @returns {string[]}          Array of field names.
   */
  const _excludeFields = (fields) => {
    return fields.filter(f => excludeFields.indexOf(f) === -1);
  };

  /**
   * Transiles given array of entity model property names to DB document field names.
   *
   * @param   {string[]} fields Entity model property names.
   *
   * @returns {string[]}        DB document field names.
   */
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

/**
 * Creates a function that transpiles DB document to an Entity model object.
 *
 * @param   {object} args         Arguments object.
 * @param   {object} args.fields  A compileFieldMap object.
 *
 * @returns {function}            Function (object) -> object.
 */
const _createDocumentFieldsTranspiler = ({fields}) => {

  /**
   * Transpile given DB document object to Entity model object.
   *
   * @param   {object} doc  DB document object.
   *
   * @returns {object}      Entity model object.
   */
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
 * Creates a model data mapper to map model properties/filters to DB document fields/filters and vice versa.
 *
 * @param   {string}    modelName                 Name of the entity model.
 * @param   {object}    options                   Mapper options object.
 * @param   {string[]}  options.baseFilter        A filter object to always apply to every filter generation.
 * @param   {object}    options.propertyMap       Key/value pairs of entity model properties (key) to DB document fields (value)
 * @param   {object}    options.operatorMap       Key/value pairs of filter name (key) and its DB equivalent applied for scalar values.
 * @param   {object}    options.arrayOperatorMap  Key/value pairs of filter name (key) and its DB equivalent applied for list values.
 * @param   {object}    options.relationMap       Entity property names (key) referring to other DB documents with a description of their relations (value).
 *
 * @returns {object}                              Model Data Mapper Api.
 */
function _createMapper(modelName, {baseFilter = {}, baseFields = [], propertyMap = {}, operatorMap = DEFAULT_OPERATOR_MAP, arrayOperatorMap = DEFAULT_ARRAY_OPERATOR_MAP, relationMap = {}} = {}) {
  const _operatorMapper           = _compileOperatorMap(operatorMap);
  const _arrayOperatorMapper      = _compileOperatorMap(arrayOperatorMap);
  const _propertyMapper           = _compilePropertyMap(propertyMap);
  const _fieldMapper              = _compileFieldMap(propertyMap);
  const _mangoSelectorTranspiler  = _createMangoSelectorTranspiler({properties: _propertyMapper, operators: _operatorMapper, arrayOperators: _arrayOperatorMapper});
  const _mangoSortTranspiler      = _createMangoSortTranspiler({properties: _propertyMapper});
  const _mangoFieldsTranspiler    = _createMangoFieldsTranspiler({properties: _propertyMapper, includeDBFields: baseFields, excludeFields: Object.keys(relationMap)});
  const _documentFieldsTranspiler = _createDocumentFieldsTranspiler({fields: _fieldMapper});
  const _relationKeys             = Object.keys(relationMap);

  /**
   * Transpiles an entity modle query to a couchdb mango query.
   *
   * @param   {object}    query         Entity model query.
   * @param   {object}    query.filter  Entity model filter object.
   * @param   {number}    query.skip    Model skip(offset) entries.
   * @param   {number}    query.limit   Model limit results.
   * @param   {object[]}  query.sort    Array of sort property objects.
   * @param   {string[]}  query.fields  Array of properties to retrieve.
   * @param   {boolean}   includeAll    Optional. If false, it will omit limit, skip and sort attributes.
   *
   * @returns {object}                  CouchDB mango query object.
   */
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

  /**
   * Translate DB document fields to entity model properties.
   *
   * @param   {object} doc  CouchDB document object.
   * @returns {object}      Entity model object.
   */
  const _getPropertiesFromFields  = (doc) => _documentFieldsTranspiler(doc);

  /**
   * Get a shallow copy of relation map object
   *
   * @returns {object}  Relation map object.
   */
  const _getRelationMap = () => Object.assign({}, relationMap || {});

  /**
   * Get the DB document ID field if such is configured for this model.
   *
   * @returns {string}  Identifier field name.
   */
  const _getIdentifierField = () => {
    if (_.isFunction(_propertyMapper['id'])) {
      return _propertyMapper['id']();
    }
    return null;
  };

  /**
   * Get the entity model ID property if such configured for this model.
   */
  const _getIdentifierProperty = () => {
    if (_.isFunction(_propertyMapper['id']) && _.isFunction(_fieldMapper[_propertyMapper['id']()])) {
      return _fieldMapper[_propertyMapper['id']()]();
    }
    return null;
  };

  //Return Entity Mapper public api functions.
  return {
    getQuery:                 _getMangoQuery,
    getPropertyMapper:        () => _propertyMapper,
    getOperatorMapper:        () => _operatorMapper,
    getArrayOperatorMapper:   () => _arrayOperatorMapper,
    getPropertiesFromFields:  _getPropertiesFromFields,
    getRelationMap:           _getRelationMap,
    getIdentifierField:       _getIdentifierField,
    getIdentifierProperty:    _getIdentifierProperty
  };
};

export const createEntityMapper = _createMapper;

export default {
  create: _createMapper
};