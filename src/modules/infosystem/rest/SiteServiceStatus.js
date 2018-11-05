import _ from 'lodash';
import {query, TEMPLATE_COLLECTION_HEADER} from './restModel';
import {asyncFilterToGraphQL, resultHandlerByPath} from './utils';
import {TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}  from './SiteService';
import {TEMPLATE_SITE_DETAILS_FIELDS} from './Site';

export const TEMPLATE_SITE_SERVICE_STATUS_ITEM_FIELDS = `
  id
  type
  endpointGroup
  value
  timestamp
  site {
    id
    pkey
    name
  }
  siteService {
    id
    endpointPKey
    endpointURL
  }
`;

export const TEMPLATE_SITE_SERVICE_STATUS_DETAILS_FIELDS =`
id
type
endpointGroup
value
timestamp
site {
  id
  pkey
  name
}
siteService {
  id
  endpointPKey
  endpointURL
}
`;

export const TEMPLATE_SITE_SERVICE_STATUS_COLLECTION_FIELDS = `
  items {
    ${TEMPLATE_SITE_SERVICE_STATUS_ITEM_FIELDS}
  }
`;

export const getCallerByIdentifier = (id, onlyQuery = false) => {
  if (onlyQuery) {
    return `id: {eq: "${id}"}`;
  }else {
    return `siteServiceStatusById(id: "${id}")`;
  }
};

export const getByIdentifier = (id) => {
  let caller = getCallerByIdentifier(id);

  return query(`{
    data: ${caller} {
      ${TEMPLATE_SITE_SERVICE_STATUS_DETAILS_FIELDS}
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
      siteService{
        ${TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}
      }
    }
  }`).then(resultHandlerByPath('data.siteService as data'));
};

export const getAll = ({filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  return asyncFilterToGraphQL(filter).then(flt => {
    return query(`
      {
        data: siteServiceStatuses(filter: ${flt}, limit: ${limit}, skip: ${skip}) {
          ${TEMPLATE_COLLECTION_HEADER}
          ${TEMPLATE_SITE_SERVICE_STATUS_COLLECTION_FIELDS}
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