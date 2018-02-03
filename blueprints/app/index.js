'use strict';

const stringUtil = require('ember-cli-string-utils');
const path = require('path');

const FileInfo = require('../../lib/models/file-info');
const insertIntoString = require('../../lib/utilities/insert-into-string');

const replacers = {
  '.eslintrc.js'(content) {
    return insertIntoString(content, `,\n        'lib/*/index.js'`, {
      eol: '',
      after: `        'config/**/*.js'`,
    }).contents;
  },
};

module.exports = {
  description: 'The default blueprint for ember-cli projects.',

  filesToRemove: [
    'app/styles/.gitkeep',
    'app/templates/.gitkeep',
    'app/views/.gitkeep',
    'public/.gitkeep',
    'Brocfile.js',
    'testem.json',
  ],

  locals(options) {
    let entity = options.entity;
    let rawName = entity.name;
    let name = stringUtil.dasherize(rawName);
    let namespace = stringUtil.classify(rawName);

    return {
      name,
      modulePrefix: name,
      namespace,
      emberCLIVersion: require('../../package').version,
      yarn: options.yarn,
      welcome: options.welcome,
    };
  },

  buildFileInfo(intoDir, templateVariables, file) {
    let mappedPath = this.mapFile(file, templateVariables);
    let options = {
      action: 'write',
      outputBasePath: path.normalize(intoDir),
      outputPath: path.join(intoDir, mappedPath),
      displayPath: path.normalize(mappedPath),
      inputPath: this.srcPath(file),
      templateVariables,
      ui: this.ui,
    };

    if (file in replacers) {
      options.replacer = replacers[file].bind(this);
    }

    return new FileInfo(options);
  },
};
