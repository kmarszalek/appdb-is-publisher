import EntityModel from '../EntityModel';

function SRVDowntimeModel(context) {
  return EntityModel.create({
    name                : 'SiteServiceStatus',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.argo.vaproviders' } },
    baseFields          : ['id', 'info.SiteName', 'info.SitePKey', 'info.SiteEndpointPKey'],
    excludeFields       : [],
    propertyMap         : {
      'id'                        : '_id',
      'site.name'                 : 'info.SiteName',
      'site.pkey'                 : 'info.SitePKey',
      'site.countryCode'          : 'info.SiteCountryCode',
      'site.country'              : 'info.SiteCountry',
      'site.roc'                  : 'info.SiteRoc',
      'site.prodInfrastructure'   : 'info.SiteProdInfrastructure',
      'site.endpointInProduction' : 'info.SiteEndpointInProduction',
      'site.endpointHostname'     : 'info.SiteEndpointHostname',
      'service.endpointPKey'      : 'info.SiteEndpointPKey',
      'type'                      : 'info.StatusType',
      'endpointGroup'             : 'info.StatusEndpointGroup',
      'value'                     : 'info.StatusValue',
      'timestamp'                 : 'info.StatusTimestamp'
    },
    relationMap         : {
      'siteService'     : {name: 'SiteService', relationType: 'belongsTo', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}},
      'site'            : {name: 'Site', relationType: 'belongsTo', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey' }}
    }
  });
}

export default SRVDowntimeModel;
