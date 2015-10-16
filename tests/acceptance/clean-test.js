'use strict';

var ember     = require('../helpers/ember');
var expect    = require('chai').expect;
var path      = require('path');
var tmp       = require('../helpers/tmp');
var conf      = require('../helpers/conf');
var root       = process.cwd();
var existsSync = require('exists-sync');
var fs = require('fs');

var appName = 'clean-me';

describe('Acceptance: ember clean', function() {
  this.timeout(20000);

  before(function() {
    conf.setup();
  });

  after(function() {
    conf.restore();
  });

  function initApp(appName) {
    return ember([
      'new',
      appName,
      '--skip-npm',
      '--skip-bower'
    ])
    .then(function() {
        var bowerrcPath = path.join(root, 'tmp', appName, '.bowerrc');
        var bowerrc = JSON.parse(fs.readFileSync(bowerrcPath));
        var bowerCachePath = path.join(root, 'tmp/bower-cache');

        bowerrc.storage = {
          packages : path.join(bowerCachePath, 'packages'),
          registry : path.join(bowerCachePath, 'registry'),
          links : path.join(bowerCachePath, 'links')
        };

        return fs.writeFileSync(bowerrcPath, JSON.stringify(bowerrc));
    })
    .then(function() {
        var npmrcPath = path.join(root, 'tmp', appName, '.npmrc');
        var npmCachePath = path.join(root, 'tmp/npm-cache');

        var npmrc = {
          cache: npmCachePath
        };

        return fs.writeFileSync(npmrcPath, JSON.stringify(npmrc));
    });
  }

  function assertFileNotExists(file) {
    var filePath = path.join(process.cwd(), file);
    expect(!existsSync(filePath), 'expected ' + file + ' not to exist');
  }

  function assertFileExists(file) {
    var filePath = path.join(process.cwd(), file);
    expect(existsSync(filePath), 'expected ' + file + ' to exist');
  }


  beforeEach(function() {
    return tmp.setup('./tmp')
      .then(function() {
        process.chdir('./tmp');
        return initApp(appName);
      })
      .then(function() {
        return tmp.setup('./tmp/' + appName + '/tmp');
      }).then(function() {
        return tmp.setup('./tmp/' + appName + '/dist');
      }).then(function() {
        return tmp.setup('./tmp/' + appName + '/bower_components');
      }).then(function() {
        return tmp.setup('./tmp/' + appName + '/node_modules');
      });
  });

  afterEach(function() {
    // process.chdir(root);
    // return tmp.teardown('./tmp');
  });

  it('skip npm and bower', function() {
    process.chdir('./tmp/' + appName);

    return ember([
      'clean',
      '--skip-npm',
      '--skip-bower',
    ]).then(function() {
      assertFileExists('node_modules/');
      assertFileExists('bower_components/');
      assertFileNotExists('tmp/');
      assertFileNotExists('dist/');
    });
  });

  it('skip npm', function() {
    process.chdir('./tmp/' + appName);

    return ember([
      'clean',
      '--skip-npm'
    ]).then(function() {
      assertFileNotExists('tmp');
      assertFileNotExists('dist');
      assertFileNotExists('bower_components');
      assertFileExists('node_modules/');
    });
  });

  it('skip bower', function() {
    process.chdir('./tmp/' + appName);

    return ember([
      'clean',
      '--skip-bower'
    ]).then(function() {
      assertFileNotExists('tmp');
      assertFileNotExists('dist');
      assertFileNotExists('node_modules');
      assertFileExists('bower_components');
    });
  });

  it('with custom --output-path', function() {
    var customOutputPath = 'distributive';
    process.chdir('./tmp/' + appName);
    return tmp.setup('./tmp/' + appName + '/' + customOutputPath)
      .then(function() {
        process.chdir('./tmp/' + appName);
        return ember([
          'clean',
          '--skip-npm',
          '--skip-bower',
          '--output-path=' + customOutputPath
        ]).then(function() {
          assertFileNotExists('tmp');
          assertFileNotExists(customOutputPath);
        });
      });
  });

});

