import _ from 'lodash';
import {query, TEMPLATE_COLLECTION_HEADER} from './restModel';
import {asyncFilterToGraphQL, resultHandlerByPath} from './utils';
import {TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}  from './SiteService';
import {TEMPLATE_SITE_DETAILS_FIELDS} from './Site';

export const TEMPLATE_SITE_SERVICE_DOWNTIME_ITEM_FIELDS = `
  id
  downtimePKey
  classification
  severity
  startDate
  endDate
  formatedStartDate
  formatedEndDate
  serviceType
  gocPortalUrl
  outcome
`;

export const TEMPLATE_SITE_SERVICE_DOWNTIME_DETAILS_FIELDS =`
  id
  downtimePKey
  classification
  severity
  startDate
  endDate
  formatedStartDate
  formatedEndDate
  serviceType
  gocPortalUrl
  outcome
  site {
    id
    pkey
    name
  }
  service {
    id
    endpointPKey
    endpointURL
  }
`;

export const TEMPLATE_SITE_SERVICE_DOWNTIME_COLLECTION_FIELDS = `
  items {
    ${TEMPLATE_SITE_SERVICE_DOWNTIME_ITEM_FIELDS}
  }
`;

export const getCallerByIdentifier = (id, onlyQuery = false) => {
  if (onlyQuery) {
    return `id: {eq: "${id}"}`;
  }else {
    return `SiteServiceDowntimeById(id: "${id}")`;
  }
};

export const getByIdentifier = (id) => {
  let caller = getCallerByIdentifier(id);

  return query(`{
    data: ${caller} {
      ${TEMPLATE_SITE_SERVICE_DOWNTIME_DETAILS_FIELDS}
    }
  }`);
};

export const getSite = (id) => {
  let caller = getCallerByIdentifier(id);
  return query(`{
    data: ${caller} {
      id
      site {
        ${TEMPLATE_SITE_DETAILS_FIELDS}
      }
    }
  }`).then(resultHandlerByPath('data.site as data'));
};

export const getSiteService = (id, imageId) => {
  let caller = getCallerByIdentifier(id);

  return query(`{
    data: ${caller} {
      id
      service {
        ${TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}
      }
    }
  }`).then(resultHandlerByPath('data.siteService as data'));
};

export const getAll = ({filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  return asyncFilterToGraphQL(filter).then(flt => {
    return query(`
      {
        data: SiteServiceDowntimes(filter: ${flt}, limit: ${limit}, skip: ${skip}) {
          ${TEMPLATE_COLLECTION_HEADER}
          ${TEMPLATE_SITE_SERVICE_DOWNTIME_COLLECTION_FIELDS}
        }
      }
    `);
  });
};



export default {
  getAll,
  getCallerByIdentifier,
  getByIdentifier,
  getSite,
  getSiteService
}