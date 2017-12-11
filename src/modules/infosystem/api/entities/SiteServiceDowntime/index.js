import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';
import _ from 'lodash';

function _initSiteServiceDowntime(context) {
  const _SiteServiceDowntimeModel = initModel(context);

  const SiteServiceDowntime = {};

  SiteServiceDowntime.getById = (id) => _SiteServiceDowntimeModel.getById(id);

  SiteServiceDowntime.getAll = ({root, args, context}) => _SiteServiceDowntimeModel.findMany(args, context);

  SiteServiceDowntime.getBySiteName = (name, fields, context) => _SiteServiceDowntimeModel.findMany( getArgsWithBaseFilter({'site.name': name}, {fields: fields}), context );

  SiteServiceDowntime.getBySiteServiceEndpointPKey = (pkey, fields, context) => _SiteServiceDowntimeModel.findMany( getArgsWithBaseFilter({'service.endpointPKey': pkey}, {fields: fields}), context );

  SiteServiceDowntime.getSite = ({root, args, context}) => context.api('site').getByName(_.get(root, 'site.name'), args.fields, context);

  SiteServiceDowntime.getSiteService = ({root, args, context}) =>context.api('siteService').getByEndpointPKey(_.get(root, 'service.endpointPKey'), args.fields, context);

  SiteServiceDowntime.getModel = () => _SiteServiceDowntimeModel;

  return SiteServiceDowntime;
}

export default _initSiteServiceDowntime;