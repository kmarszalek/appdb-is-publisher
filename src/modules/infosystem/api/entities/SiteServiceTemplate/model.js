import EntityModel from '../EntityModel';
function SiteServiceTemplateModel(context) {
  return EntityModel.create({
    name                : 'SiteServiceTemplate',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.top.vaproviders.templates' } },
    baseFields          : ['_id', 'info.SiteName', 'info.SitePKey', 'info.SiteEndpointPKey'],
    excludeFields       : ['site', 'service'],
    propertyMap         : {
      'id'                                              : '_id',
      'site.name'                                       : 'info.SiteName',
      'site.pkey'                                       : 'info.SitePKey',
      'service.endpointPKey'                            : 'info.SiteEndpointPKey',
      'entityName'                                      : 'info.GLUE2EntityName',
      'resourceID'                                      : 'info.GLUE2ResourceID',
      'resourceManager'                                 : 'info.GLUE2ResourceManagerForeignKey',
      'executionEnvironmentMainMemorySize'              : 'info.GLUE2ExecutionEnvironmentMainMemorySize',
      'executionEnvironmentPhysicalCPUs'                : 'info.GLUE2ExecutionEnvironmentPhysicalCPUs',
      'executionEnvironmentLogicalCPUs'                 : 'info.GLUE2ExecutionEnvironmentLogicalCPUs',
      'executionEnvironmentCPUMultiplicity'             : 'info.GLUE2ExecutionEnvironmentCPUMultiplicity',
      'executionEnvironmentOSFamily'                    : 'info.GLUE2ExecutionEnvironmentOSFamily',
      'executionEnvironmentConnectivityIn'              : 'info.GLUE2ExecutionEnvironmentConnectivityIn',
      'executionEnvironmentConnectivityOut'             : 'info.GLUE2ExecutionEnvironmentConnectivityOut',
      'executionEnvironmentCPUModel'                    : 'info.GLUE2ExecutionEnvironmentCPUModel',
      'executionEnvironmentDiskSize'                    : 'info.GLUE2ExecutionEnvironmentDiskSize',
      'executionEnvironmentPlatform'                    : 'info.GLUE2ExecutionEnvironmentPlatform',
      'executionEnvironmentCPUVendor'                   : 'info.GLUE2ExecutionEnvironmentCPUVendor',
      'executionEnvironmentVirtualMachine'              : 'info.GLUE2ExecutionEnvironmentVirtualMachine',
      'executionEnvironmentComputingManagerForeignKey'  : 'info.GLUE2ExecutionEnvironmentComputingManagerForeignKey',
      'resourceManagerForeignKey'                       : 'info.GLUE2ResourceManagerForeignKey',
      'entityOtherInfo'                                 : 'info.GLUE2EntityOtherInfo',
      'hash'                                            : 'info.hash'
    },
    relationMap         : {
      'site'            : { name: 'Site', relationType: 'belongsTo', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey' }, sharedFields: {'name': 'site.name', 'pkey': 'site.pkey'}},
      'service'         : { name: 'SiteService', relationType: 'belongsTo', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}, sharedFields: {'endpointPKey': 'service.endpointPKey'}},
      'images'          : { name: 'SiteServiceImage', relationType: 'manyToMany', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}}
    }
  });
}

export default SiteServiceTemplateModel;