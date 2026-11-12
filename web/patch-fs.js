const fs = require('fs');

// Fix for Windows network drives (Z:\ mapping WSL/9P) where Windows returns
// ERROR_DIRECTORY (EISDIR) instead of ERROR_NOT_A_REPARSE_POINT (EINVAL)
// when readlink is called on a regular file.
function wrapError(err, path) {
  if (err && (err.code === 'EISDIR' || err.errno === -4068 || err.errno === -4048)) {
    const einval = new Error(`EINVAL: invalid argument, readlink '${path}'`);
    einval.code = 'EINVAL';
    einval.errno = -4071;
    einval.syscall = 'readlink';
    einval.path = path;
    return einval;
  }
  return err;
}

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync.call(fs, path, options);
  } catch (err) {
    throw wrapError(err, path);
  }
};

const origReadlink = fs.readlink;
fs.readlink = function (path, ...args) {
  const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
  const options = args[0];
  return origReadlink.call(fs, path, options, (err, linkString) => {
    if (cb) {
      if (err) cb(wrapError(err, path));
      else cb(null, linkString);
    }
  });
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (path, options) {
    try {
      return await origPromisesReadlink.call(fs.promises, path, options);
    } catch (err) {
      throw wrapError(err, path);
    }
  };
}
