import EntityModel from '../EntityModel';
import _ from 'lodash';

function VOImageModel(context) {
  return EntityModel.create({
    name                : 'VO',
    dbName              : 'isappdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.top.vaproviders.images' } },
    baseFields          : ['id', 'info.SiteName', 'info.SitePKey', 'info.SiteEndpointPKey', 'info.ImageVoVmiInstanceVO'],
    excludeFields       : ['sites', 'services'],
    propertyMap         : {
      'id'                    : 'info.ImageVoVmiInstanceVO',
      'sites.name'            : 'info.SiteName',
      'sites.pkey'            : 'info.SitePKey',
      'services.endpointPKey' : 'info.SiteEndpointPKey',
      'name'                  : 'info.ImageVoVmiInstanceVO',
      'hash'                  : 'info.hash'
    },
    relationMap         : {
      'sites'           : { name: 'Site', relationType: 'hasMany', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey' }, sharedFields: {'name': 'site.name', 'pkey': 'site.pkey'}},
      'services'        : { name: 'SiteService', relationType: 'manyToMany', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}, sharedFields: {'service.endpointPKey': 'service.endpointPKey'}},
      'templates'       : { name: 'SiteServiceTemplate', relationType: 'manyToMany', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}},
      'images'          : { name: 'SiteServiceImages', relationType: 'manyToMany', relationOn: {key: 'info.ImageVoVmiInstanceVO', foreignKey: 'info.ImageVoVmiInstanceVO'}}
    },
    preProcessOperations: {
      'findMany': [
        (args, context) => {
          return Promise.resolve([
            Object.assign(args, {limit: 0, skip: 0}),
            context
          ]);
        }
      ]
    },
    postProcessOperations: {
      'findMany': [
        (initialCallArgs = [], callArgs = [], response) => {
          let [args, context] = callArgs;
          let [initialArgs] = initialCallArgs;

          return new Promise((resolve, reject) => {
            try {
              response.items = _.chain(response.items)
                .map(item => item.name)
                .filter(name => !!name)
                .uniq().value();

              response.limit = initialArgs.limit || 0;
              response.skip = initialArgs.skip || 0;
              response.totalCount = response.items.length;
              response.items = _.chain(response.items)
                .sort()
                .slice(response.skip || 0)
                .take(response.limit || response.items.length)
                .map(item => ({name: item})).value();

              resolve([initialCallArgs, callArgs, response]);
            } catch (e) {
              reject(e);
            }
          });
        }
      ]
    }
  });
}

export default VOImageModel;