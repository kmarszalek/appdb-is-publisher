import _ from 'lodash';
const toPCREString = (str) => str.split('*').map(s => (s) ? '\\Q' + s + '\\E' : s).join('.*');

export const DEFAULT_DB_LIMIT = 10000000;
export const DEFAULT_DB_FIELDS =  ["_id", "info", "meta"];
export const DEFAULT_MODEL_FINDMANY_ARGUMENTS = {filter: {}, skip: 0, limit:DEFAULT_DB_LIMIT, sort: [], includeTotalCount: false, translateProperties: true, wrapItemsToCollection: true, nestedLevel: 0};
export const DEFAULT_MODEL_FINDONE_ARGUMENTS = {filter: {}, fields: DEFAULT_DB_FIELDS};
export const DEFAULT_ARRAY_OPERATOR_MAP = {
  // Array Matches if none of the selectors in the array match.
  "nor"           : "$nor",
  // Array Matches an array value if it contains all the elements of the argument array.
  "all"           : "$all",
  // Array Matches if all the selectors in the array match.
  "and"           : "$and",
  // Array Matches if any of the selectors in the array match. All selectors must use the same index.
  "or"            : "$or",
  // Array Matches if some of the selectors in the array match.
  "containsSome"  : (v) => {
    let res = {"$elemMatch": {"$or": []}};
    res.$elemMatch.$or = v.map(val => {
      if (_.isString(val) && val.indexOf('*') > -1) {
        return {$regex: toPCREString(val)};
      }
      return {$eq: val};
    });

    return res;
  },
  // Array Matches if some of the selectors in the array match (case insensitive).
  "icontainsSome" : (v) => {
    let res = {"$elemMatch": {"$or": []}};
    res.$elemMatch.$or = v.map(val => {
      if (_.isString(val)) {
        return {$regex: "(?i)" + toPCREString(val)};
      }
      return {$eq: val};
    });

    return res;
  },
  // Array Matches if all of the selectors in the array match.
  "containsAll"   : (v, filter) => {
    let res = {$and: []};
    res.$and = v.map(val => {
      if (_.isString(val) && val.indexOf('*') > -1) {
        return {"$elemMatch": {$regex: toPCREString(val)}};
      }
      return {"$elemMatch": {"$eq": val}};
    });

    return res;
  },
  // Array Matches if all of the selectors in the array match (case insensitive).
  "icontainsAll": (v) => {
    let res = {"$and": []};
    res.$and = v.map(val => {
      if (_.isString(val)) {
        return {"$elemMatch" :{$regex: "(?i)" + toPCREString(val)}};
      }
      return {"$elemMatch": {$eq: val}};
    });

    return res;
  },
  // Array Matches if one of the selectors in the array match.
  "oneOf": (v) => {
    let res = {$or: []};
    res.$or = v.map((val) => {
      if (_.isString(val) && val.indexOf('*') > -1) {
        return {"$regex": toPCREString(val)};
      } else {
        return {"$eq" : val};
      }
    });
    return res;
  },
  // Array Matches if the value is between the greatest and the lowest of the given array.
  "between": (v) => {
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
  },
  // Array Matches if the array field contains values between the greatest and the lowest of the given array.
  "containsBetween": (v) => {
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
      "$elemMatch": {
        "$gte": min,
        "$lte": max
      }
    };
  }
};

export const DEFAULT_OPERATOR_MAP = {
  // Selector	Matches if the given selector does not match.
  "not"         : "$not",
  // Selector	Matches and returns all documents that contain an array field with at least one element that matches all the specified query criteria.
  "elemMatch"   : "$elemMatch",
  // Matches and returns all documents that contain an array field with all its elements matching all the specified query criteria.
  "allMatch"    : "$allMatch",
  // Any JSON	The field is less than the argument
  "lt"          : "$lt",
  // Any JSON	The field is less than or equal to the argument.
  "le"          : "$lte",
  // Any JSON	The field is equal to the argument
  "eq"          : "$eq",
  // Any JSON	The field is not equal to the argument.
  "ne"          : "$ne",
  // Any JSON	The field is greater than or equal to the argument.
  "ge"          : "$gte",
  // Any JSON	The field is greater than the to the argument.
  "gt"          : "$gt",
  // Check whether the field exists or not, regardless of its value.
  "exists"      : "$exists",
  // Checks whether the field contains given value.
  "contains"    : (v) => {
    let res = {"$elemMatch": {}};
    if (_.isString(v) && v.indexOf('*') > -1) {
      res['$elemMatch'] = {
        '$regex': toPCREString(v)
      };
    } else {
      res['$elemMatch'] = { '$eq': v };
    }
    return res;
  },
  // Checks whether the field contains given value (case insensitive).
  "icontains"   : (v) => {
    let res = {"$elemMatch": {}};
    res['$elemMatch'] = {
      '$regex': "(?i)" + toPCREString(v)
    };

    return res;
  },
  // Special condition to match the length of an array field in a document. Non-array fields cannot match this condition.
  "size"        : "$size",
  // Perform case sensitive text match against a document field.
  "like"        : (v) => { return {"$regex": toPCREString(v)}; },
  // Perform case insensitive text match against a document field.
  "ilike"       : (v) => { return {"$regex": "(?i)" + toPCREString(v)}; },
  // A regular expression pattern to match against the document field. Only matches when the field is a string value and matches the supplied regular expression. The matching algorithms are based on the Perl Compatible Regular Expression (PCRE) library. For more information about what is implemented, see the see the Erlang Regular Expression
  "regex"       : "$regex"
};