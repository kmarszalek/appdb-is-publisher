export const getArgsWithBaseFilter = (filter = {}, args = {filter: {}}) => {
  args = args || {};
  args.filter = args.filter || {};
  args.filter = Object.assign({}, args.filter, filter || {});

  return Object.assign({}, args);
};