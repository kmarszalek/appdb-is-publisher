import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';
import _ from 'lodash';

function _initSiteService(context) {
  const _SiteServiceModel = initModel(context);

  const SiteService = {};

  SiteService.getById = (id, context) => _SiteServiceModel.getById(id, context);

  SiteService.getByEndpointPKey = (pkey, fields, context) => _SiteServiceModel.findOne({filter: {'endpointPKey': pkey}, fields: fields}, context);

  SiteService.getAll = ({root, args, context}) => _SiteServiceModel.findMany(args, context);

  SiteService.getSite = ({root, args, context}) => context.api('site').getByGocDBPKey(_.get(root, 'site.pkey'), args.fields,  context);

  SiteService.getSiteServiceTemplates = ({root, args, context}) =>
    context.api('siteServiceTemplate').getAll({
      root,
      args: getArgsWithBaseFilter({'service.endpointPKey': root.endpointPKey}, args),
      context
    });

  SiteService.getSiteServiceImages = ({root, args, context}) =>
    context.api('siteServiceImage').getAll({
      root,
      args: getArgsWithBaseFilter({'service.endpointPKey': root.endpointPKey}, args),
      context
    });

  SiteService.getSiteServiceDowntimes = ({root, args, context}) => context.api('siteServiceDowntime').getBySiteServiceEndpointPKey(root.endpointPKey, args.fields || ["_id", "info"], context);

  SiteService.getSiteServiceStatus = ({root, args, context}) => context.api('siteServiceStatus').getByEndpointPKey(root.endpointPKey, args.fields, context);

  SiteService.getModel = () => _SiteServiceModel;

  return SiteService;
}

export default _initSiteService;