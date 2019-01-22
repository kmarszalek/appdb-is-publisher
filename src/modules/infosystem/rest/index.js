import Site from './Site';
import SiteAdditional from './SiteAdditional';
import SiteService from './SiteService';
import SiteServiceImage from './SiteServiceImage';
import SiteServiceTemplate from './SiteServiceTemplate';
import SiteServiceStatus from './SiteServiceStatus';
import SiteServiceDowntime from './SiteServiceDowntime';
import _ from 'lodash';

const DEFAULT_LIMIT = 20;

/**
 * Express middleware to attach request metadata to express request object.
 *
 * @param {object} args             Metadata arguments.
 * @param {object} args.entityType  Name of information system entity.
 * @param {object} args.dataType    Either item or collection.
 */
const RequestMetaData = ({entityType = null, dataType = 'item'} = {entityType: null, dataType: 'item'}) => {
  return (req, res, next) => {
    req.requestMetaData = Object.assign({}, {entityType, dataType});

    next();
  };
};

/**
 * Returns function to create an express middleware RequestMetaData for collection response types.
 *
 * @param {object} args             Metadata arguments.
 * @param {object} args.entityType  Name of information system entity.
 */
const CollectionMetaData = ({entityType}) => RequestMetaData({entityType, dataType: 'collection'});

/**
 * Returns function to create an express middleware RequestMetaData for item response types.
 *
 * @param {object} args             Metadata arguments.
 * @param {object} args.entityType  Name of information system entity.
 */
const ItemMetaData = ({entityType}) => RequestMetaData({entityType, dataType: 'item'});

/**
 * Apply request metadata to the given document object.
 *
 * @param   {object} doc  Document object.
 * @param   {object} req  Express request object.
 * @param   {object} ext  Optional. Extended attributes to attach to document.
 *
 * @returns {object}
 */
const applyMetaData = (doc, req, ext) => {
  ext = _.isPlainObject(ext) ? ext : {};
  req.requestMetaData = req.requestMetaData || {};
  doc = {...req.requestMetaData, ...ext, ...doc};
  return doc;
};

/**
 * Handle GraphQL resource not found error.
 *
 * @param {object} req  Express request.
 * @param {object} res  Express response.
 */
const _handleMissing = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404);
  let doc = {
    httpStatus: 404,
    error: {
      type: 'NOT_FOUND',
      message: 'Not found',
      details: 'The requested resource does not exist.'
    }
  };
  res.json(doc);
  res.end();
};

/**
 * Handle GraphQL invalid request error.
 *
 * @param {object} req  Express request.
 * @param {object} res  Express response.
 */
export const handleUnknown = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(400);
  let doc = {
    httpStatus: 400,
    error: {
      type: 'BAD_REQUEST',
      message: 'Bad request',
      details: 'Invalid request. Please check the URL for errors.'
    }
  };
  res.json(doc);
  res.end();
};

/**
 * Handle GraphQL not implemented yet error.
 *
 * @param {object} req  Express request.
 * @param {object} res  Express response.
 */
export const handleNoImlementation = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(501);
  let doc = {
    httpStatus: 501,
    error: {
      type: "NOT_IMPLEMENTED",
      message: 'Not implemented',
      details: 'The requested facility is not implemented yet.'
    }
  };
  res.json(doc);
  res.end();
};

/**
 * Extract GraphQL invalid filter value error.
 *
 * @param   {string} errorMessage   GraphQL error message.
 * @returns {string}                Error message or null.
 */
const getInvalidFilterFromError = (errorMessage) => {
  let match = /^Argument\s+\"filter\" has invalid value (\{.*\})\./i.exec(errorMessage);
  return (match) ? match[1] : null;
};

/**
 * Collect GraphQL errors and create one error message.
 *
 * @param   {object} e  GrpahQL response object.
 *
 * @returns {string}    Error message.
 */
const getGraphqlErrors = (e) => {
  let responseErrors = _.get(e, 'response.errors', []);
  return _.map(responseErrors, r => r.message).filter(e => !!e).map(s => s.replace(/\n/g, ' ')).join('\n');
};

/**
 * Handle GraphQL invalid filter error.
 *
 * @param   {object} req  Express request.
 * @param   {object} res  Express response.
 * @param   {object} e    GraphQL response object.
 *
 * @returns {boolean}     The error is handled.
 */
const handleInvalidFilterError = (req, res, e) => {
  let errorMessage = (_.isString(e) ? e : e.message ) || '';
  let invalidFilter = /setting\s+.+\s+filter\s+property\s+as\s+\w+\s+value\s+with\s+invalid\s+operator/i.exec(errorMessage);
  if (!invalidFilter) {
    return false;
  }
  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "INVALID_FILTER_OPERATOR",
      message: 'Use of unsupported filtering operator in the provided filter.',
      details: e.message
    }
  }
);

  return true;
};

/**
 * Handle GraphQL unsupported filtering semantics error.
 *
 * @param   {object} req  Express request.
 * @param   {object} res  Express response.
 * @param   {object} e    GraphQL response object.
 *
 * @returns {boolean}     The error is handled.
 */
const handleUnknownFilter = (req, res, e) => {
  let errorMessage = (_.isString(e) ? e : e.message ) || '';
  let invalidFilter = /Cannot\s+parse\s+all\s+of\s+the\s+filter\s+string\.\s+Unknown\s+filter/i.exec(errorMessage);
  if (!invalidFilter) {
    return false;
  }
  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "UNKNOWN_FILTER",
      message: 'Use of unsupported filtering semantics.',
      details: e.message
    }
  }
);

  return true;
};

/**
 * Handle GraphQL invalid filter for entity type error.
 *
 * @param   {object} req  Express request.
 * @param   {object} res  Express response.
 * @param   {object} e    GraphQL response object.
 *
 * @returns {boolean}     The error is handled.
 */
const handleInvalidGraphQLFilterError = (req, res, e) => {
  let errorMessage = (_.isString(e) ? e : e.message ) || '';
  let invalidFilter = getInvalidFilterFromError(errorMessage);
  if (!invalidFilter) {
    return false;
  }

  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "INVALID_FILTER",
      message: "The provided filter is invalid for this entity type (" + invalidFilter + ").",
      details: getGraphqlErrors(e)
    }
  }
);

  return true;
};

/**
 * Handle GraphQL generic backend error.
 *
 * @param   {object} req  Express request.
 * @param   {object} res  Express response.
 * @param   {object} e    GraphQL response object.
 *
 * @returns {boolean}     The error is handled.
 */
const handleGenericGraphQLError = (req, res, e) => {
  let isGraphQLError = (_.has(e, 'message') && _.has(e, 'stack') && _.has(e, 'response.errors') && _.has(e, 'request'));
  if (!isGraphQLError) {
    return false;
  }

  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "INVALID_REQUEST",
      message: "A backend service error occured while processing the request.",
      details: getGraphqlErrors(e)
    }
  }
);

  return true;
};

/**
 * Handle graphql response.
 *
 * @param   {Promise} pr    Resolved graphql request.
 * @param   {object}  req   Express request object.
 * @param   {object}  res   Express response object.
 *
 * @returns {Promise}       Resolved REST request.
 */
const _handleRequest = (pr, req, res) => {
  return pr.then(doc => {
    doc = applyMetaData(doc, req, {httpStatus: 200});
    if (doc.data === null) {
      return Promise.resolve(_handleMissing(req, res));
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(doc);
    res.end();
  }
).catch(e => {
    res.setHeader('Content-Type', 'application/json');
    if (
      !handleInvalidFilterError(req, res, e) &&
      !handleUnknownFilter(req, res, e) &&
      !handleInvalidGraphQLFilterError(req, res, e) &&
      !handleGenericGraphQLError(req, res, e)
    ) {
      res.status(500);
      res.json({...req.requestMetaData, httpStatus: 500, error: e});
    }
    res.end();
  }
);
}

/**
 * Extract collection parameters from request object.
 *
 * @param   {object} req  Express request object.
 * @returns {object}      Collection parameters.
 */
const getCollectionRequestParams = (req) => {
  return {
    filter: _.trim(req.query.filter) || {},
    limit: parseInt(req.query.limit) || DEFAULT_LIMIT,
    skip: parseInt(req.query.skip) || 0
  };
}

export const expressRouter = function (router, config) {
  //############################################
  //################## SITES ###################
  //############################################

  router.get(
    '/sites/:siteId/services/:serviceId/images/:imageId',
    [ItemMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let siteId = _.trim(req.params.siteId);
      let serviceId = _.trim(req.params.serviceId);
      let imageId = _.trim(req.params.imageId);

      _handleRequest(Site.getSiteServiceImage(siteId, serviceId, imageId), req, res);
    }
  );

  router.get(
    '/sites/:siteId/services/:serviceId/images',
    [CollectionMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let siteId = _.trim(req.params.siteId);
      let serviceId = _.trim(req.params.serviceId);
      let params = getCollectionRequestParams(req);

      _handleRequest(Site.getAllSiteServiceImages(siteId, serviceId, params), req, res);
    }
  );

  router.get(
    '/sites/:siteId/services/:serviceId/templates/:templateId',
    [ItemMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let siteId = _.trim(req.params.siteId);
      let serviceId = _.trim(req.params.serviceId);
      let templateId = _.trim(req.params.templateId);

      _handleRequest(Site.getSiteServiceTemplate(siteId, serviceId, templateId), req, res);
    }
  );

  router.get(
    '/sites/:siteId/services/:serviceId/templates',
    [CollectionMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let siteId = _.trim(req.params.siteId);
      let serviceId = _.trim(req.params.serviceId);
      let params = getCollectionRequestParams(req);

      _handleRequest(Site.getAllSiteServiceTemplates(siteId, serviceId, params), req, res);
    }
  );

  router.get(
    '/sites/:siteId/services/:serviceId',
    [ItemMetaData({entityType: 'SiteService'})],
    (req, res) => {
      let siteId = _.trim(req.params.siteId);
      let serviceId = _.trim(req.params.serviceId);

      _handleRequest(Site.getSiteService(siteId, serviceId), req, res);
    }
  );

  router.get(
    '/sites/:siteId/services',
    [CollectionMetaData({entityType: 'SiteService'})],
    (req, res) => {
      let params = getCollectionRequestParams(req);
      let siteId = _.trim(req.params.siteId);

      _handleRequest(Site.getAllSiteServices(siteId, params), req, res);
    }
  );

  router.get(
    '/sites/:siteId',
    [ItemMetaData({entityType: 'Site'})],
    (req, res) => {
      let siteId = _.trim(req.params.siteId );

      _handleRequest(Site.getByIdentifier(siteId), req, res);
    }
  );

  router.get(
    '/sites',
    [CollectionMetaData({entityType: 'Site'})],
    (req, res) => {
      let params = getCollectionRequestParams(req);

      _handleRequest(Site.getAll(params), req, res);
    }
  );

    router.get(
        '/sitesAdditional',
        [CollectionMetaData({entityType: 'SiteAdditional'})],
        (req, res) => {
            let params = getCollectionRequestParams(req);

            _handleRequest(SiteAdditional.getAll(params), req, res);
        }
    );

    router.get(
        '/sitesAdditional/:siteId',
        [ItemMetaData({entityType: 'SiteAdditional'})],
        (req, res) => {
            let siteId = _.trim(req.params.siteId );

            _handleRequest(SiteAdditional.getByIdentifier(siteId), req, res);
        }
    );

  //#############################################
  //############### SITE SERVICES ###############
  //#############################################

  router.get(
    '/services/:serviceId/templates/:templateId',
    [ItemMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let serviceId = _.trim(req.params.serviceId );
      let templateId = _.trim(req.params.templateId );

      _handleRequest(SiteService.getTemplate(serviceId, templateId), req, res);
    }
  );

  router.get(
    '/services/:serviceId/templates',
    [CollectionMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let serviceId = _.trim(req.params.serviceId );
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteService.getAllTemplates(serviceId, params), req, res);
    }
  );

  router.get(
    '/services/:serviceId/images/:imageId',
    [ItemMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let serviceId = _.trim(req.params.serviceId );
      let imageId = _.trim(req.params.imageId );

      _handleRequest(SiteService.getImage(serviceId, imageId), req, res);
    }
  );

  router.get(
    '/services/:serviceId/images',
    [CollectionMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let serviceId = _.trim(req.params.serviceId );
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteService.getAllImages(serviceId, params), req, res);
    }
  );

  router.get(
    '/services/:serviceId/site',
    [ItemMetaData({entityType: 'Site'})],
      (req, res) => {
      let serviceId = _.trim(req.params.serviceId );

      _handleRequest(SiteService.getSite(serviceId), req, res);
    }
  );

  router.get(
    '/services/:serviceId',
    [ItemMetaData({entityType: 'SiteService'})],
      (req, res) => {
      let serviceId = _.trim(req.params.serviceId );

      _handleRequest(SiteService.getByIdentifier(serviceId), req, res);
    }
  );

  router.get(
    '/services',
    [CollectionMetaData({entityType: 'SiteService'})],
      (req, res) => {
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteService.getAll(params), req, res);
    }
  );

  //###########################################
  //################ TEMPLATES ################
  //###########################################

  router.get(
    '/templates/:templateId/images/:imageId',
    [ItemMetaData({entityType: 'SiteServiceImage'})],
      (req, res) => {
      let templateId = _.trim(req.params.templateId );
      let imageId = _.trim(req.params.imageId );

      _handleRequest(SiteServiceTemplate.getSiteServiceImage(templateId, imageId), req, res);
    }
  );

  router.get(
    '/templates/:templateId/images',
    [CollectionMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let templateId = _.trim(req.params.templateId );
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteServiceTemplate.getAllSiteServiceImages(templateId, params), req, res);
    }
  );

  router.get(
    '/templates/:templateId/service',
    [ItemMetaData({entityType: 'SiteService'})],
    (req, res) => {
      let templateId = _.trim(req.params.templateId );

      _handleRequest(SiteServiceTemplate.getSiteService(templateId), req, res);
    }
  );

  router.get(
    '/templates/:templateId/site',
    [ItemMetaData({entityType: 'Site'})],
    (req, res) => {
      let templateId = _.trim(req.params.templateId );

      _handleRequest(SiteServiceTemplate.getSite(templateId), req, res);
    }
  );

  router.get(
    '/templates/:templateId',
    [ItemMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let templateId = _.trim(req.params.templateId );

      _handleRequest(SiteServiceTemplate.getByIdentifier(templateId), req, res);
    }
  );

  router.get(
    '/templates',
    [CollectionMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteServiceTemplate.getAll(params), req, res);
    }
  );

  //###########################################
  //################## IMAGES #################
  //###########################################

  router.get(
    '/images/:imageId/templates/:templateId',
    [ItemMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let imageId = _.trim(req.params.imageId );
      let templateId = _.trim(req.params.templateId);

      _handleRequest(SiteServiceImage.getSiteServiceTemplate(imageId, templateId), req, res);
    }
  );

  router.get(
    '/images/:imageId/templates',
    [CollectionMetaData({entityType: 'SiteServiceTemplate'})],
    (req, res) => {
      let imageId = _.trim(req.params.imageId );
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteServiceImage.getAllSiteServiceTemplates(imageId, params), req, res);
    }
  );

  router.get(
    '/images/:imageId/service',
    [ItemMetaData({entityType: 'SiteService'})],
    (req, res) => {
      let imageId = _.trim(req.params.imageId );

      _handleRequest(SiteServiceImage.getSiteService(imageId), req, res);
    }
  );

  router.get(
    '/images/:imageId/site',
    [ItemMetaData({entityType: 'Site'})],
      (req, res) => {
      let imageId = _.trim(req.params.imageId );

      _handleRequest(SiteServiceImage.getSite(imageId), req, res);
    }
  );

  router.get(
    '/images/:imageId',
    [ItemMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let imageId = _.trim(req.params.imageId );

      _handleRequest(SiteServiceImage.getByIdentifier(imageId), req, res);
    }
  );

  router.get(
    '/images',
    [CollectionMetaData({entityType: 'SiteServiceImage'})],
    (req, res) => {
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteServiceImage.getAll(params), req, res);
    }
  );

  //###########################################
  //###########  Argo Statuses  ###############
  //###########################################

  router.get(
    '/statuses/:statusId/service',
    [CollectionMetaData({entityType: 'SiteServiceStatus'})],
    (req, res) => {
      let statusId = _.trim(req.params.statusId);

      _handleRequest(SiteServiceStatus.getSiteService(statusId), req, res);
    }
  );

  router.get(
    '/statuses/:statusId/site',
    [CollectionMetaData({entityType: 'SiteServiceStatus'})],
    (req, res) => {
      let statusId = _.trim(req.params.statusId);

      _handleRequest(SiteServiceStatus.getSite(statusId), req, res);
    }
  );

  router.get(
    '/statuses/:statusId',
    [CollectionMetaData({entityType: 'SiteServiceStatus'})],
    (req, res) => {
      let statusId = _.trim(req.params.statusId);

      _handleRequest(SiteServiceStatus.getByIdentifier(statusId), req, res);
    }
  );

  router.get(
    '/statuses',
    [CollectionMetaData({entityType: 'SiteServiceStatus'})],
    (req, res) => {
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteServiceStatus.getAll(params), req, res);
    }
  );

  //###########################################
  //##########  GocDB Downtimes  ##############
  //###########################################

  router.get(
    '/downtimes/:downtimeId/service',
    [CollectionMetaData({entityType: 'SiteServiceDowntime'})],
    (req, res) => {
      let downtimeId = _.trim(req.params.downtimeId);

      _handleRequest(SiteServiceDowntime.getSiteService(downtimeId), req, res);
    }
  );

  router.get(
    '/downtimes/:downtimeId/site',
    [CollectionMetaData({entityType: 'SiteServiceDowntime'})],
    (req, res) => {
      let downtimeId = _.trim(req.params.downtimeId);

      _handleRequest(SiteServiceDowntime.getSite(downtimeId), req, res);
    }
  );

  router.get(
    '/downtimes/:downtimeId',
    [CollectionMetaData({entityType: 'SiteServiceDowntime'})],
    (req, res) => {
      let downtimeId = _.trim(req.params.downtimeId);

      _handleRequest(SiteServiceDowntime.getByIdentifier(downtimeId), req, res);
    }
  );

  router.get(
    '/downtimes',
    [CollectionMetaData({entityType: 'SiteServiceDowntime'})],
    (req, res) => {
      let params = getCollectionRequestParams(req);

      _handleRequest(SiteServiceDowntime.getAll(params), req, res);
    }
  );

  router.get(
    '/',
    (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.status(501);
      res.json(serviceDescription);
      res.end();
    }
  );

  console.log('[infosystem:Rest] Inited');
  return router;
};

/**
 * Rest API service description.
 */
export const serviceDescription = {
  '/rest': {
    description: 'Service to query the information system in a RESTful fashion',
    routes: {
      '/sites': {
        description: 'List of sites in the information system.Each site may contain one or more services. If the site has at least one cloud service, it may also contain VM images and cloud execution templates.'
      },
    '/sitesAdditional': {
        description: 'List of sites in the information system.Each site may contain one or more services. If the site has at least one cloud service, it may also contain VM images and cloud execution templates.'
    },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]': {
        description: 'A site entry in the information system. Can be retrieved by the information system ID, the name of the site, or the pkey as provided by the gocdb portal API'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services': {
        description: 'List of services provided by the current site. Services may contain one or more VM image references and execution templates.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <id>]': {
        description: 'A service entry in the information system. Can be retrieved by the information system ID, or the endpoint pkey as provided by the gocdb portal API'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/images': {
        description: 'List of VM images provided by the current service.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/images/<id>': {
        description: 'A VM image entry in the information system. Can be retrieved by the information system ID.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/templates': {
        description: 'List of templates provided by the current service.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/templates/<id>': {
        description: 'A template entry in the ninformation system. Can be retrieved by the information system ID.'
      },
      '/services': {
        description: 'List of services in the information system. Services may contain one or more VM image references and execution templates.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]': {
        description: 'A service entry in the information system.Can be retrieved by the information system ID, or the endpoint pkey as provided by the gocdb portal API'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/site': {
        description: 'Retrieve the site entry theat the current service belongs to.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/images': {
        description: 'Retrieve a list of VM images the current sevice provides.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/images/<id>': {
        description: 'A VM image entry provided by the current service.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/templates': {
        description: 'Retrieve a list of templates the current service provides.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/templates/<id>': {
        description: 'A template entry provided by the current service.'
      },
      '/images': {
        description: 'List of VM image entries in the information system.'
      },
      '/images/<id>': {
        description: 'A VM image entry in the information system. Can be retieved with the information system ID.'
      },
      '/images/<id>/service': {
        description: 'The service entry in the information system the current VM image belongs to.'
      },
      '/images/<id>/site': {
        description: 'The site entry in the information system the current VM image belongs to.'
      },
      '/images/<id>/temlates': {
        description: 'List of templates in the information system that can be used with the current VM image belongs to.'
      },
      '/images/<id>/templates/<id>': {
        description: 'A template entry that can be used with the current VM image.'
      },
      '/templates': {
        description: 'List of templates in the information system.'
      },
      '/templates/<id>': {
        description: 'A template entry in the information system. Can be retrieved with the information system ID.'
      },
      '/templates/<id>/service': {
        description: 'The service entry that the current template belongs to.'
      },
      '/templates/<id>/site': {
        description: 'The site entry that the current template belongs to.'
      },
      '/templates/<id>/images': {
        description: 'List of VM images that can use the current template.'
      },
      '/templates/<id>/images/<id>': {
        description: 'A VM image entry that can use the current template.'
      },
      '/statuses': {
        description: 'List of argo service status entries in the information system.'
      },
      '/statuses/<id>': {
        description: 'An argo service status entry in the information system. Can be retrieved with the information system ID.'
      },
      '/statuses/<id>/site': {
        description: 'The related site entry that the current argo entry refers to.'
      },
      '/statuses/<id>/service': {
        description: 'The related site service entry that the current argo entry refers to.'
      },
      '/downtimes': {
        description: 'List of GocDB downtime report entries in the information system.'
      },
      '/downtimes/<id>': {
        description: 'A GocDB downtime report entry in the information system. Can be retrieved with the information system ID.'
      },
      '/downtimes/<id>/site': {
        description: 'The related site entry that the current GocDB downtime report entry refers to.'
      },
      '/downtimes/<id>/service': {
        description: 'The related site service entry the current  GocDB downtime report entry refers to.'
      }
    }
  }
};