import crypto from 'crypto';
const _hash = crypto.createHash('md5');
const _digestEncoding = 'hex'; // options: 'hex', 'latin1', 'base64
const _join = '::';

/**
 * Creates MD5 hash based on the given arguments
 * @param {*} data
 */
function md5(...data) {
  return _hash.update(data.join(_join)).digest(_digestEncoding)
}

export default md5;