import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';

function _initSiteAdditional(context) {
  const _SiteAdditionalModel = initModel(context);

  const SiteAdditional = {};

  SiteAdditional.getById = (id, fields, context) => _SiteAdditionalModel.getById(id, fields || ["_id","info"], context);

  SiteAdditional.getByGocDBPKey = (pkey, fields, context) => _SiteAdditionalModel.findOne({filter: {'pkey': {eq: pkey}}, fields: fields || ["_id","info"]}, context);

  SiteAdditional.getByName = (name, fields, context) => _SiteAdditionalModel.findOne({filter: {'name': {eq: name}}, fields: fields || ["_id", "info"]}, context);

  SiteAdditional.getAll = ({root, args, context}) => _SiteAdditionalModel.findMany(args, context);

  SiteAdditional.getSiteAdditionalServices = ({root, args, context}) => context.api('siteService').getAll({
      root,
      args: getArgsWithBaseFilter({'site.pkey': root.pkey}, args),
      context
    });

  SiteAdditional.getSiteAdditionalServiceImages = ({root, args, context}) =>
    context.api('siteAdditionalServiceImage').getAll({
      root,
      args: getArgsWithBaseFilter({'site.pkey': root.pkey}, args),
      context
    });

  SiteAdditional.getSiteAdditionalServiceTemplates = ({root, args, context}) =>
    context.api('siteAdditionalServiceTemplate').getAll({
      root,
      args: getArgsWithBaseFilter({'site.pkey': root.pkey}, args),
      context
    });

  SiteAdditional.getSRVDowntimes = ({root, args, context}) => context.api('srvDowntime').getBySiteName(root.name, args.fields, context);

  SiteAdditional.getSiteAdditionalServiceStatuses = ({root, args, context}) => context.api('siteServiceStatus').getBySiteName(root.name, args.fields, context);

  SiteAdditional.getSiteAdditionalServiceDowntimes = ({root, args, context}) => context.api('siteServiceDowntime').getBySiteName(root.name, args.fields, context);

  SiteAdditional.getModel = () => _SiteAdditionalModel;

  return SiteAdditional;
}

export default _initSiteAdditional;