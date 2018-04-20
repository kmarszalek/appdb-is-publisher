import EntityModel from '../EntityModel';
function SiteServiceModel(context) {
  return EntityModel.create({
    name                : 'SiteService',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.top.vaproviders' } },
    baseFields          : ['_id', 'info.SiteName', 'info.SitePKey', 'info.SiteEndpointPKey'],
    excludeFields       : ['site', 'images', 'templates'],
    propertyMap         : {
      'id'                                                : '_id',
      'site.name'                                         : 'info.SiteName',
      'site.pkey'                                         : 'info.SitePKey',
      'endpointPKey'                                      : 'info.SiteEndpointPKey',
      'isInProduction'                                    : 'info.SiteEndpointInProduction',
      'beta'                                              : 'info.SiteEndpointBeta',
      'gocPortalUrl'                                      : 'info.SiteEndpointGocPortalUrl',
      'gocEndpointUrl'                                    : 'info.SiteEndpointUrl',
      'endpointURL'                                       : 'info.GLUE2EndpointURL',
      'endpointServiceType'                               : 'info.SiteEndpointServiceType',
      'endpointID'                                        : 'info.GLUE2EndpointID',
      'endpointInterfaceName'                             : 'info.GLUE2EndpointInterfaceName',
      'endpointInterfaceVersion'                          : 'info.GLUE2EndpointInterfaceVersion',
      'endpointTechnology'                                : 'info.GLUE2EndpointTechnology',
      'endpointQualityLevel'                              : 'info.GLUE2EndpointQualityLevel',
      'endpointCapabilities'                              : 'info.GLUE2EndpointCapability',
      'endpointServingState'                              : 'info.GLUE2EndpointServingState',
      'endpointHealthState'                               : 'info.GLUE2EndpointHealthState',
      'endpointImplementor'                               : 'info.GLUE2EndpointImplementor',
      'endpointImplementationVersion'                     : 'info.GLUE2EndpointImplementationVersion',
      'location.id'                                       : 'info.GLUE2LocationID.GLUE2LocationID',
      'location.longitude'                                : 'info.GLUE2LocationID.GLUE2LocationLongitude',
      'location.latitude'                                 : 'info.GLUE2LocationID.GLUE2LocationLatitude',
      'location.country'                                  : 'info.GLUE2LocationID.GLUE2LocationCountry',
      'location.domainForeignKey'                         : 'info.GLUE2LocationID.GLUE2LocationDomainForeignKey',
      'computingEndpointComputingServiceForeignKey'       : 'info.GLUE2ComputingEndpointComputingServiceForeignKey',
      'endpointServiceForeignKey'                         : 'info.GLUE2EndpointServiceForeignKey',
      'managerID'                                         : 'info.GLUE2ManagerID',
      'managerProductName'                                : 'info.GLUE2ManagerProductName',
      'managerProductVersion'                             : 'info.GLUE2ManagerProductVersion',
      'computingManagerTotalLogicalCPUs'                  : 'info.GLUE2ComputingManagerTotalLogicalCPUs',
      'computingManagerWorkingAreaTotal'                  : 'info.GLUE2ComputingManagerWorkingAreaTotal',
      'entityOtherInfo'                                   : 'info.GLUE2EntityOtherInfo',
      'imageList'                                         : 'info.images',
      'numberOfImages'                                    : 'meta.num_images',
      'templateList'                                      : 'info.templates',
      'numberOfTemplates'                                 : 'meta.num_templates',
      'hash'                                              : 'info.hash'
    },
    relationMap         : {
      'site'            : {name: 'Site', relationType: 'belongsTo', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey'}, sharedFields: {'name': 'site.name', 'pkey': 'site.pkey'} },
      'images'          : {name: 'SiteServiceImage', relationType: 'hasMany', relationOn: {key: 'info.SiteEndpointPKey', foreignKey: 'info.SiteEndpointPKey'}},
      'templates'       : {name: 'SiteServiceTemplate', relationType: 'hasMany', relationOn: {key: 'info.SiteEndpointPKey',foreignKey: 'info.SiteEndpointPKey'}},
      'serviceStatuses' : {name: 'SiteServiceStatus', relationType: 'hasOne', relationOn: {key: 'info.SiteEndpointPKey', foreignKey: 'info.SiteEndpointPKey'}},
      'serviceDowntimes': {name: 'SiteServiceDowntime', relationType: 'hasMany', relationOn: {key: 'info.SiteEndpointPKey', foreignKey: 'info.SiteEndpointPKey'}}
    },
    postProcessFields : {
      'info.images'     : (doc) => doc.map(d => ({_id: 'egi.top.vaproviders.images.' + d.hash, info: d})),
      'info.templates'  : (doc) => doc.map(d => ({_id: 'egi.top.vaproviders.templates.' + d.hash, info: d}))
    }
  });
}

export default SiteServiceModel;