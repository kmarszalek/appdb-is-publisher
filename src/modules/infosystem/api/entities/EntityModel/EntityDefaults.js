import _ from 'lodash';
const toPCREString = (str) => str.split('*').map(s => (s) ? '\\Q' + s + '\\E' : s).join('.*');

export const DEFAULT_DB_LIMIT = 10000000;
export const DEFAULT_DB_FIELDS =  ["_id", "info", "meta"];
export const DEFAULT_MODEL_FINDMANY_ARGUMENTS = {filter: {}, skip: 0, limit:DEFAULT_DB_LIMIT, sort: [], includeTotalCount: false, translateProperties: true, wrapItemsToCollection: true, nestedLevel: 0};
export const DEFAULT_MODEL_FINDONE_ARGUMENTS = {filter: {}, fields: DEFAULT_DB_FIELDS};
export const DEFAULT_ARRAY_OPERATOR_MAP = {
  "nor": "$nor",            // Array	Matches if none of the selectors in the array match.
  "all": "$all",            // Array	Matches an array value if it contains all the elements of the argument array.
  "and": "$and",            // Array	Matches if all the selectors in the array match.
  "or": "$or",               // Array	Matches if any of the selectors in the array match. All selectors must use the same index.
  "oneOf": (v) => {
    let res = {$or: []};
    v = v || [];
    v = Array.isArray(v) ? v : [v];
    res.$or = v.map((val) => {
      if (_.isString(val) && val.indexOf('*') > -1) {
        return {"$regex": toPCREString(val)};
      } else {
        return {"$eq" : val};
      }
    });
    return res;
  },
  "between": (v) => {console.log(v);
    let max = Math.max(...v);
    let min = Math.min(...v);

    if (max === min) {
      if (max > 0) {
        min = 0;
      } else if (max < 0) {
        min = max;
        max = 0;
      }
    }

    return {
      "$gte": min,
      "$lte": max
    };
  }
};
export const DEFAULT_OPERATOR_MAP = {
  "not": "$not",            // Selector	Matches if the given selector does not match.
  "elemMatch": "$elemMatch",// Selector	Matches and returns all documents that contain an array field with at least one element that matches all the specified query criteria.
  "allMatch" :"$allMatch",  // Matches and returns all documents that contain an array field with all its elements matching all the specified query criteria.
  "lt": "$lt",              // Any JSON	The field is less than the argument
  "le": "$lte",            // Any JSON	The field is less than or equal to the argument.
  "eq": "$eq",	            // Any JSON	The field is equal to the argument
  "ne": "$ne",              // Any JSON	The field is not equal to the argument.
  "ge": "$gte",            // Any JSON	The field is greater than or equal to the argument.
  "gt": "$gt",              // Any JSON	The field is greater than the to the argument.
  "exists": "$exists",      // Check whether the field exists or not, regardless of its value.
  //"type": "$type",          // Check the document field’s type. Valid values are "null", "boolean", "number", "string", "array", and "object".
  "contains": (v) => {
    let res = {"$elemMatch": {}};
    if (_.isString(v) && v.indexOf('*') > -1) {console.log(v);
      res['$elemMatch'] = {
        '$regex': toPCREString(v)
      };
    } else {
      res['$elemMatch'] = {
        '$eq': v
      };
    }
    return res;
  },
  "icontains": (v) => {
    let res = {"$elemMatch": {}};
    res['$elemMatch'] = {
      '$regex': "(?i)" + toPCREString(v)
    };

    return res;
  },
  "size" : "$size",
  "like": (v) => {          // Special condition to match the length of an array field in a document. Non-array fields cannot match this condition.
    return {"$regex": toPCREString(v)};
  },
  "ilike": (v) => {
    return {"$regex": "(?i)" + toPCREString(v)};
  },
  "regex": "$regex"         // A regular expression pattern to match against the document field. Only matches when the field is a string value and matches the supplied regular expression. The matching algorithms are based on the Perl Compatible Regular Expression (PCRE) library. For more information about what is implemented, see the see the Erlang Regular Expression
};