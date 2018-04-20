import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';
import _ from 'lodash';

function _initSiteServiceTemplate(context) {
  const _SiteServiceTemplateModel = initModel(context);

  const SiteServiceTemplate = {};

  SiteServiceTemplate.getById = (id, context) => _SiteServiceTemplateModel.getById(id, context);

  SiteServiceTemplate.getAll = ({root, args, context}) => _SiteServiceTemplateModel.findMany(args, context);

  SiteServiceTemplate.getSite = ({root, args, context}) => context.api('site').getByGocDBPKey(_.get(root, 'site.pkey'), args.fields, context);

  SiteServiceTemplate.getSiteService = ({root, args, context}) => context.api('siteService').getByEndpointPKey(_.get(root, 'service.endpointPKey'), args.fields, context);

  SiteServiceTemplate.getSiteServiceImages = ({root, args, context}) => context.api('siteService').getSiteServiceImages({
    root: {endpointPKey: _.get(root, 'service.endpointPKey')},
    args,
    context
  });

  SiteServiceTemplate.getModel = () => _SiteServiceTemplateModel;

  return SiteServiceTemplate;
}

export default _initSiteServiceTemplate;