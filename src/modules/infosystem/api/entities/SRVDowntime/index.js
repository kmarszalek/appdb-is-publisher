import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';

function _initSRVDowntime(context) {
  const _SRVDowntimeModel = initModel(context);

  const SRVDowntime = {};

  SRVDowntime.getById = (id, context) =>_SRVDowntimeModel.getById(id, context);

  SRVDowntime.getBySiteName = (name, fields, context) =>_SRVDowntimeModel.findMany( getArgsWithBaseFilter({'site.name': name}, {fields: fields}), context );

  SRVDowntime.getAll = ({root, args, context}) =>_SRVDowntimeModel.findMany(args, context);

  SRVDowntime.getSite = ({root, args, context}) =>context.api('site').getByName(_.get(root, 'site.name'), args.fields, context);

  SRVDowntime.getSiteService = ({root, args, context}) =>
    context.api('siteService').getAll({
      root,
      args: getArgsWithBaseFilter({'service.endpointPKey': root['endpointPKey']}, args),
      context
    });

  SRVDowntime.getModel = () => _SRVDowntimeModel;

  return SRVDowntime;
}

export default _initSRVDowntime;