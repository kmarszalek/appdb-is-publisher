import EntityModel from '../EntityModel';

function SiteModel(context) {
  return EntityModel.create({
    name                : 'Site',
    dbName              : 'testdb',
    dbConnection        : () => context.storage,
    baseFilter          : { 'meta.collection': { '$eq': 'egi.goc.sites' } },
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
      'hash'                : 'info.hash'
    },
    relationMap         : {
      'services'        : {name: 'SiteService', relationType: 'hasMany', relationOn: {key: 'info.SitePKey', foreignKey:  'info.SitePKey'}},
      'images'          : {name: 'SiteServiceImage', relationType: 'hasMany', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey'}},
      'templates'       : {name: 'SiteServiceTemplate', relationType: 'hasMany', relationOn: {key: 'info.SitePKey', foreignKey: 'info.SitePKey'}}
    } 
  });
}

export default SiteModel;