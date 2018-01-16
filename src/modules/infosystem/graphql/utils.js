import _ from 'lodash';
import getCollectionFieldNames from './getASTCollectionInfo';
import getFieldNames from 'graphql-list-fields';

const getValidationResolver = (entityName) => {
  return async (root, args, context, info) => await Promise.resolve();
};

const getAuthorizationResolver = (entityName) => {
  return async (root, args, context, info) => await Promise.resolve();
};

const getDataResolver = (entityName, action) => {
  return async (root, args, context, info) => {
    return await context.api.get(entityName)[action]({root, args: args, context, info});
  };
};

const getResolverFor = (entityName, action) => {
  let _resolveChain = [
    getAuthorizationResolver(entityName, action),
    getValidationResolver(entityName, action),
    getDataResolver(entityName, action)
  ];

  return async (root, args, context, info) => {
    return await _resolveChain( async (result, func) =>  await func(root, args, context, info), null );
  }
};

export const prepareCollectionResolverArgs = (args, ast) => {
  let collectionInfo = _.reduce(getCollectionFieldNames(ast), (acc, field) => {
    if (field === 'totalCount') {
      acc.includeTotalCount = true;
    } else if (field.indexOf('items.') === 0) {
      acc.fields.push(field.replace(/^items\./, ''));
    }

    return acc;
  }, {
    includeTotalCount: false,
    fields: []
  });

  return Object.assign({}, args, collectionInfo);
}

export const prepareItemResolverArgs = (args, ast) => {
  let itemInfo = _.reduce(getFieldNames(ast), (acc, field) => {
    acc.fields.push(field);
    return acc;
  }, {
    fields: []
  });

  return Object.assign({}, args, itemInfo);
};

export const apiActionResolver = (api, defaultAction) => {
  let _api = _.transform((api || '').split('#'), (acc, val, index) => {
    switch(index) {
      case 0:
        acc.entityName = _.trim(val);
        break;
      case 1:
        if (_.trim(val)) {
          acc.actionName = _.trim(val);
        }
        break;
    }
  },{
    entityName: '',
    actionName: defaultAction || 'getAll'
  });

  return ({root, args, context, info}) => {
    let entity = context.api(_api.entityName);

    return entity[_api.actionName].apply(entity, [{root, args, context, info}]);
  };
};

export const resolveArrayWith = (apiAction) => {
  let _apiCall = apiActionResolver(apiAction, 'getAll');

  return  (root, args, context, info) => _apiCall({
    root,
    args: prepareItemResolverArgs(args, info),
    context,
    info
  }).then(result => result.items || []);

};

export const resolveCollectionWith = (apiAction) => {
  let _apiCall = apiActionResolver(apiAction, 'getAll');

  return (root, args, context, info) => _apiCall({
    root,
    args: prepareCollectionResolverArgs(args, info),
    context,
    info
  });
};

export const resolveItemWith = (apiAction) => {
  let _apiCall = apiActionResolver(apiAction, 'getAll');

  return (root, args, context, info) => _apiCall({
    root,
    args: prepareItemResolverArgs(args, info),
    context,
    info
  });
};

export const resolveMapArrayWith = (apiAction, path = '') => {
  let _apiCall = apiActionResolver(apiAction, 'getModel');

  return (root, args, context, info) => {
    return Promise.resolve(_apiCall({root, args, context, info}).map(_.get(root, path, [])));
  };
};

export const resolveMapDataWith = (apiAction, path = '') => {
  let _apiCall = apiActionResolver(apiAction, 'getModel');

  return (root, args, context, info) =>  Promise.resolve(_apiCall({root, args, context, info}).mapOne(_.get(root, path, [])));
};

export const resolveAs = {
  collectionWith: resolveCollectionWith,
  arrayWith: resolveArrayWith,
  itemWith: resolveItemWith,
  mapArrayWith: resolveMapArrayWith,
  mapDataWith: resolveMapDataWith
};

export default {
  getResolverFor: getResolverFor,
  prepareCollectionResolverArgs: prepareCollectionResolverArgs,
  prepareItemResolverArgs: prepareItemResolverArgs,
  resolveItemWith: resolveItemWith,
  resolveCollectionWith: resolveCollectionWith,
  resolveArrayWith: resolveArrayWith,
  resolveMapArrayWith: resolveMapArrayWith,
  resolveMapDataWith: resolveMapDataWith,
  resolveAs: resolveAs
};