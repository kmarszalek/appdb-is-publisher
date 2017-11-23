import EntityModel from '../EntityModel';
function SiteServiceImageModel(context) {
  return EntityModel.create({
    name                : 'SiteServiceImage',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.top.vaproviders.images' } },
    baseFields          : ['_id', 'info.SiteName', 'info.SitePKey', 'info.SiteEndpointPKey'],
    excludeFields       : ['site', 'service'],
    propertyMap         : {
      'id'                                                : '_id',
      'site.name'                                         : 'info.SiteName',
      'site.pkey'                                         : 'info.SitePKey',
      'service.endpointPKey'                              : 'info.SiteEndpointPKey',
      'entityName'                                        : 'info.GLUE2EntityName',
      'applicationEnvironmentID'                          : 'info.GLUE2ApplicationEnvironmentID',
      'applicationEnvironmentRepository'                  : 'info.GLUE2ApplicationEnvironmentRepository',
      'applicationEnvironmentAppName'                     : 'info.GLUE2ApplicationEnvironmentAppName',
      'applicationEnvironmentAppVersion'                  : 'info.GLUE2ApplicationEnvironmentAppVersion',
      'applicationEnvironmentDescription'                 : 'info.GLUE2ApplicationEnvironmentDescription',
      'applicationEnvironmentComputingManagerForeignKey'  : 'info.GLUE2ApplicationEnvironmentComputingManagerForeignKey',
      'imageBaseMpUri'                                    : 'info.ImageBaseMpUri',
      'imageContentType'                                  : 'info.ImageContentType',
      'imageVoVmiInstanceId'                              : 'info.ImageVoVmiInstanceId',
      'imageVmiInstanceId'                                : 'info.ImageVmiInstanceId',
      'imageVoVmiInstanceVO'                              : 'info.ImageVoVmiInstanceVO',
      'imageAppDBVAppID'                                  : 'info.ImageAppDBVAppID',
      'hash'                                              : 'info.hash'
    },
    relationMap         : {
      'site'            : { name: 'Site', relationType: 'belongsTo', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey' }, sharedFields: {'name': 'site.name', 'pkey': 'site.pkey'}},
      'service'         : { name: 'SiteService', relationType: 'belongsTo', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}, sharedFields: {'endpointPKey': 'service.endpointPKey'}},
      'templates'       : { name: 'SiteServiceTemplate', relationType: 'manyToMany', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}}
    }
  });
}

export default SiteServiceImageModel;