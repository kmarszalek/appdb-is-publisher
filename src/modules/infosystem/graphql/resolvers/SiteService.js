import {resolveAs, prepareCollectionResolverArgs, prepareItemResolverArgs} from '../utils';

const SiteServiceResolver = {
  Query: {
    siteServiceById: (root, args, context, info) => context.api('siteService').getById(args.id, prepareItemResolverArgs(args, info).fields || [], context),
    siteServiceByGocDBPKey: (root, args, context, info) => context.api('siteService').getByEndpointPKey(args.id, prepareItemResolverArgs(args, info).fields || [], context),
    siteServices: resolveAs.collectionWith('siteService')
  },
  SiteService: {
    site: resolveAs.itemWith('siteService#getSite'),
    images: resolveAs.collectionWith('siteService#getSiteServiceImages'),
    templates: resolveAs.collectionWith('siteService#getSiteServiceTemplates'),
    serviceDowntimes: resolveAs.arrayWith('siteService#getSiteServiceDowntimes'),
    serviceStatus: resolveAs.itemWith('siteService#getSiteServiceStatus'),
    imageList: resolveAs.mapArrayWith('siteServiceImage', 'imageList'),
    templateList: resolveAs.mapArrayWith('siteServiceTemplate', 'templateList')
  }
};

export default SiteServiceResolver;