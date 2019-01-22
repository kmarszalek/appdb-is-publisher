import {resolveAs, prepareCollectionResolverArgs, prepareItemResolverArgs} from '../utils';

const SiteAdditionalResolver = {
  Query: {
    siteAdditionalById: (root, args, context, info) => context.api('siteAdditional').getById(args.id, context),
    siteAdditionalByGocDBPKey: (root, args, context, info) => context.api('siteAdditional').getByGocDBPKey(args.id, prepareItemResolverArgs(args, info).fields || [], context),
    siteAdditionalByName: (root, args, context, info) => context.api('siteAdditional').getByName(args.name, prepareItemResolverArgs(args, info).fields || [], context),
    siteAdditionals: resolveAs.collectionWith('siteAdditional#getAll')
  },
  SiteAdditional: {
    services: resolveAs.collectionWith('siteAdditional#getSiteServices'),
    templates: resolveAs.collectionWith('siteAdditional#getSiteServiceTemplates'),
    images: resolveAs.collectionWith('siteAdditional#getSiteServiceImages'),
    SRVDowntimes: resolveAs.arrayWith('site#getSRVDowntimes'),
    serviceStatuses: resolveAs.arrayWith('siteAdditional#getSiteServiceStatuses'),
    serviceDowntimes: resolveAs.arrayWith('siteAdditional#getSiteServiceDowntimes')
  }
};

export default SiteAdditionalResolver;