import initModel from './model';
import _ from 'lodash';

function _initSiteServiceStatus(context) {
  const _SiteServiceStatusModel = initModel(context);

  const SiteServiceStatus = {};

  SiteServiceStatus.getById = (id, context) => _SiteServiceStatusModel.getById(id, context);

  SiteServiceStatus.getAll = ({root, args, context}) => _SiteServiceStatusModel.findMany(args, context);

  SiteServiceStatus.getByEndpointPKey = (pkey, fields, context) => _SiteServiceStatusModel.findOne({filter: {'service.endpointPKey': pkey}, fields: fields || ["_id","info"]}, context);

  SiteServiceStatus.getBySiteName = (name, fields, context) => _SiteServiceStatusModel.findMany({filter: {'site.name': name}, fields: fields}, context);

  SiteServiceStatus.getSite = ({root, args, context}) => context.api('site').getByName(_.get(root, 'site.name'), args.fields, context);

  SiteServiceStatus.getSiteService = ({root, args, context}) => context.api('siteService').getByEndpointPKey(_.get(root, 'service.endpointPKey'), args.fields, context);

  SiteServiceStatus.getModel = () => _SiteServiceStatusModel;

  return SiteServiceStatus;
}

export default _initSiteServiceStatus;