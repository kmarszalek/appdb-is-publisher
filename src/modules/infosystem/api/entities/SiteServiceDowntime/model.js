import EntityModel from '../EntityModel';
function SiteServiceDowntimeModel(context) {
  return EntityModel.create({
    name                : 'SiteServiceDowntime',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.goc.vadowntimes' } },
    baseFields          : ['id', 'info.SiteName', 'info.SitePKey', 'info.SiteEndpointPKey'],
    excludeFields       : ['site', 'service'],
    propertyMap         : {
      'id'                    : '_id',
      'service.endpointPKey'  : 'info.SiteEndpointPKey',
      'site.hostname'         : 'info.SiteEndpointHostname',
      'site.name'             : 'info.SiteName',
      'downtimePKey'          : 'info.DowntimePKey',
      'classification'        : 'info.DowntimeClassification',
      'severity'              : 'info.DowntimeSeverity',
      'startDate'             : 'info.DowntimeStartDate',
      'endDate'               : 'info.DowntimeEndDate',
      'formatedStartDate'     : 'info.DowntimeFormatedStartDate',
      'formatedEndDate'       : 'info.DowntimeFormatedEndDate',
      'serviceType'           : 'info.DowntimeServiceType',
      'gocPortalUrl'          : 'info.DowntimeGocPortalUrl',
      'outcome'               : 'info.DowntimeOutcome'
    },
    relationMap         : {
      'site'            : {name: 'Site', relationType: 'belongsTo', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey' },  sharedFields: {'name': 'site.name'}},
      'service'         : {name: 'SiteService', relationType: 'belongsTo', relationOn: {key: 'info.SiteEndpointPKey', foreignKey:  'info.SiteEndpointPKey'}, sharedFields: {'endpointPKey': 'service.endpointPKey'}}
    }
  });
}

export default SiteServiceDowntimeModel;
