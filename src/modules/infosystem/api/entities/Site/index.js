import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';

function _initSite(context) {
  const _SiteModel = initModel(context);

  const Site = {};

  Site.getById = (id, fields, context) => _SiteModel.getById(id, fields || ["_id","info"], context);

  Site.getByGocDBPKey = (pkey, fields, context) => _SiteModel.findOne({filter: {'pkey': {eq: pkey}}, fields: fields || ["_id","info"]}, context);

  Site.getByName = (name, fields, context) => _SiteModel.findOne({filter: {'name': {eq: name}}, fields: fields || ["_id", "info"]}, context);

  Site.getAll = ({root, args, context}) => _SiteModel.findMany(args, context);

  Site.getSiteServices = ({root, args, context}) => context.api('siteService').getAll({
      root,
      args: getArgsWithBaseFilter({'site.pkey': root.pkey}, args),
      context
    });

  Site.getSiteServiceImages = ({root, args, context}) =>
    context.api('siteServiceImage').getAll({
      root,
      args: getArgsWithBaseFilter({'site.pkey': root.pkey}, args),
      context
    });

  Site.getSiteServiceTemplates = ({root, args, context}) =>
    context.api('siteServiceTemplate').getAll({
      root,
      args: getArgsWithBaseFilter({'site.pkey': root.pkey}, args),
      context
    });

  Site.getSRVDowntimes = ({root, args, context}) => context.api('srvDowntime').getBySiteName(root.name, args.fields, context);

  Site.getSiteServiceStatuses = ({root, args, context}) => context.api('siteServiceStatus').getBySiteName(root.name, args.fields, context);

  Site.getSiteServiceDowntimes = ({root, args, context}) => context.api('siteServiceDowntime').getBySiteName(root.name, args.fields, context);

  Site.getModel = () => _SiteModel;

  return Site;
}

export default _initSite;