/**
 * Ensures given filter will apply on the given mango query.
 *
 * @param   {object} filter Base filter (mango select).
 * @param   {object} args   Mango query.
 *
 * @returns {object}        Mango query with base filter.
 */
export const getArgsWithBaseFilter = (filter = {}, args = {filter: {}}) => {
  args = args || {};
  args.filter = args.filter || {};
  args.filter = Object.assign({}, args.filter, filter || {});

  return Object.assign({}, args);
};