import crypto from 'crypto';
const _hash = crypto.createHash('md5');
const _digestEncoding = 'hex'; // options: 'hex', 'latin1', 'base64
const _join = '::';

function md5(...data) {
  return _hash.update(data.join(_join)).digest(_digestEncoding)
}

export default md5;