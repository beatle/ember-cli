'use strict';

const fs = require('fs-extra');
const existsSync = require('exists-sync');
const EOL = require('os').EOL;
const RSVP = require('rsvp');

const insertIntoString = require('./insert-into-string');
const Promise = RSVP.Promise;
const writeFile = RSVP.denodeify(fs.outputFile);

/**
  Inserts the given content into a file. If the `contentsToInsert` string is already
  present in the current contents, the file will not be changed unless `force` option
  is passed.

  If `options.before` is specified, `contentsToInsert` will be inserted before
  the first instance of that string.  If `options.after` is specified, the
  contents will be inserted after the first instance of that string.
  If the string specified by options.before or options.after is not in the file,
  no change will be made. Both of these options support regular expressions.

  If neither `options.before` nor `options.after` are present, `contentsToInsert`
  will be inserted at the end of the file.

  It will create a new file if one doesn't exist, unless you set the `options.create`
  option to `false`.

  Example:

  ```
  // app/router.js
  Router.map(function() {
  });
  ```

  ```
  insertIntoFile('app/router.js', '  this.route("admin");', {
    after: 'Router.map(function() {' + EOL
  });
  ```

  ```
  // app/router.js
  Router.map(function() {
    this.route("admin");
  });
  ```

  @method insertIntoFile
  @param {String} pathRelativeToProjectRoot
  @param {String} contentsToInsert
  @param {Object} options
  @return {Promise}
*/
function insertIntoFile(fullPath, contentsToInsert, options) {
  options = Object.assign({}, options || {}, {
    // for backward compat reasons we always insert environment EOL at the end of insertion
    eol: EOL,
  });

  let returnValue = {
    path: fullPath,
    originalContents: '',
    contents: '',
    inserted: false,
  };

  let exists = existsSync(fullPath);

  if (exists || (!exists && options.create !== false)) {
    let originalContents = '';

    if (exists) {
      originalContents = fs.readFileSync(fullPath, { encoding: 'utf8' });
    }

    Object.assign(returnValue, insertIntoString(originalContents, contentsToInsert, options));

    if (returnValue.inserted) {
      return writeFile(fullPath, returnValue.contents)
        .then(() => returnValue);
    }
  }

  return Promise.resolve(returnValue);
}

module.exports = insertIntoFile;
