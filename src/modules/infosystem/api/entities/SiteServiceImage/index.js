import initModel from './model';
import _ from 'lodash';

function _initSiteServiceImage(context) {
  const _SiteServiceImageModel = initModel(context);

  const SiteServiceImage = {};

  SiteServiceImage.getById = (id, context) => _SiteServiceImageModel.getById(id, context);

  SiteServiceImage.getAll = ({root, args, context}) => _SiteServiceImageModel.findMany(args, context);

  SiteServiceImage.getSite =  ({root, args, context}) => context.api('site').getByGocDBPKey(_.get(root, 'site.pkey'), args.fields, context);

  SiteServiceImage.getSiteService =  ({root, args, context}) => context.api('siteService').getByEndpointPKey(_.get(root, 'service.endpointPKey'), args.fields, context);

  SiteServiceImage.getSiteServiceTemplates = ({root, args, context}) => context.api('siteService').getSiteServiceTemplates({
    root: {endpointPKey: _.get(root, 'service.endpointPKey')},
    args,
    context
  });

  SiteServiceImage.getModel = () => {
    return _SiteServiceImageModel;
  };

  return SiteServiceImage;
}

export default _initSiteServiceImage;