import {resolveAs, prepareCollectionResolverArgs, prepareItemResolverArgs} from '../utils';

const SiteResolver = {
  Query: {
    siteById: (root, args, context, info) => context.api('site').getById(args.id, context),
    siteByGocDBPKey: (root, args, context, info) => context.api('site').getByGocDBPKey(args.id, prepareItemResolverArgs(args, info).fields || [], context),
    siteByName: (root, args, context, info) => context.api('site').getByName(args.name, prepareItemResolverArgs(args, info).fields || [], context),
    sites: resolveAs.collectionWith('site#getAll')
  },
  Site: {
    services: resolveAs.collectionWith('site#getSiteServices'),
    templates: resolveAs.collectionWith('site#getSiteServiceTemplates'),
    images: resolveAs.collectionWith('site#getSiteServiceImages'),
    SRVDowntimes: resolveAs.arrayWith('site#getSRVDowntimes'),
    serviceStatuses: resolveAs.arrayWith('site#getSiteServiceStatuses'),
    serviceDowntimes: resolveAs.arrayWith('site#getSiteServiceDowntimes')
  }
};

export default SiteResolver;