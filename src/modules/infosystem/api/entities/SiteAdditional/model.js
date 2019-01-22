import EntityModel from '../EntityModel';

function SiteAdditionalModel(context) {
  return EntityModel.create({
    name                : 'SiteAdditional',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.goc.sites.extraData' } },
    baseFields          : ['_id', 'info.SitePKey', 'info.SiteName'],
    excludeFields       : ['services', 'images', 'templates'],
    propertyMap         : {
      'id'                  : '_id',
      'pkey'                : 'info.SitePKey',
      'name'                : 'info.SiteName',
      'shortName'           : 'info.SiteShortName',
      'officialName'        : 'info.SiteOfficialName',
      'description'         : 'info.SiteDescription',
      'gocdbPortalUrl'      : 'info.SiteGocdbPortalUrl',
      'homeUrl'             : 'info.SiteHomeUrl',
      'giisUrl'             : 'info.SiteGiisUrl' ,
      'countryCode'         : 'info.SiteCountryCode',
      'country'             : 'info.SiteCountry',
      'tier'                : 'info.SiteTier',
      'subgrid'             : 'info.SiteSubgrid',
      'roc'                 : 'info.SiteRoc',
      'prodInfrastructure'  : 'info.SiteProdInfrastructure',
      'certStatus'          : 'info.SiteCertStatus',
      'timezone'            : 'info.SiteTimezone',
      'latitude'            : 'info.SiteLatitude',
      'longitude'           : 'info.SiteLongitude',
      'domainName'          : 'info.SiteDomainname',
      'hash'                : 'info.hash',
      'extraData'           : 'info.SiteExtraData'
    },
    relationMap          : {
      'services'         : {name: 'SiteService', relationType: 'hasMany', relationOn: {key: 'info.SiteAdditionalPKey', foreignKey:  'info.SiteAdditionalPKey'}},
      'images'           : {name: 'SiteServiceImage', relationType: 'hasMany', relationOn: {key: 'info.SiteAdditionalPKey', foreignKey: 'info.SiteAdditionalPKey'}},
      'templates'        : {name: 'SiteServiceTemplate', relationType: 'hasMany', relationOn: {key: 'info.SiteAdditionalPKey', foreignKey: 'info.SiteAdditionalPKey'}},
      'serviceStatuses'  : {name: 'SiteServiceStatus', relationType: 'hasMany', relationOn: {key: 'info.SiteAdditionalPKey', foreignKey: 'info.SiteAdditionalPKey'}},
      'serviceDowntimes' : {name: 'SiteServiceDowntime', relationType: 'hasMany', relationOn: {key: 'info.SiteAdditionalPKey', foreignKey: 'info.SiteAdditionalPKey'}}
    }
  });
}

export default SiteAdditionalModel;