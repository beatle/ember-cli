'use strict';

const EOL = require('os').EOL;

/**
  Inserts the given content into a string. If the `contentsToInsert` string is already
  present in the current contents, the original string will not be changed unless `force` option
  is passed.

  If `options.before` is specified, `contentsToInsert` will be inserted before
  the first instance of that string.  If `options.after` is specified, the
  contents will be inserted after the first instance of that string.
  If the string specified by options.before or options.after is not in the source string,
  no change will be made. Both of these options support regular expressions.

  If neither `options.before` nor `options.after` are present, `contentsToInsert`
  will be inserted at the end of the source string.

  Example:

  ```
  const source = `Router.map(function() {
  });`

  insertIntoString(source, '  this.route("admin");', {
    after: 'Router.map(function() {' + EOL
  });
  ```

  will result in the following output:

  ```
  Router.map(function() {
    this.route("admin");
  });
  ```

  @method insertIntoString
  @throws {Error} if the source parameter is not a string
  @param {String} pathRelativeToProjectRoot
  @param {String} contentsToInsert
  @param {Object} options
  @return {Promise}
*/
function insertIntoString(source, contentsToInsert, options) {
  if (typeof source !== 'string') {
    throw Error('source must be a string');
  }

  options = options || {};

  let contents = source;

  let alreadyPresent = source.indexOf(contentsToInsert) > -1;
  let insert = !alreadyPresent;
  let insertBehavior = 'end';

  if (options.before) { insertBehavior = 'before'; }
  if (options.after) { insertBehavior = 'after'; }

  if (options.force) { insert = true; }

  if (insert) {
    if (insertBehavior === 'end') {
      contents += contentsToInsert;
    } else {
      let contentMarker = options[insertBehavior];
      if (contentMarker instanceof RegExp) {
        let matches = contents.match(contentMarker);
        if (matches) {
          contentMarker = matches[0];
        }
      }
      let contentMarkerIndex = contents.indexOf(contentMarker);

      if (contentMarkerIndex !== -1) {
        let insertIndex = contentMarkerIndex;
        if (insertBehavior === 'after') { insertIndex += contentMarker.length; }

        const eol = typeof options.eol === 'string' ? options.eol : EOL;
        contents = contents.slice(0, insertIndex) +
          contentsToInsert + eol +
          contents.slice(insertIndex);
      }
    }
  }

  return {
    source,
    contents,
    inserted: contents !== source,
  };
}

module.exports = insertIntoString;
