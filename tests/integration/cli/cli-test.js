'use strict';

const expect = require('../../chai').expect;
const MockUI = require('console-ui/mock');
const MockAnalytics = require('../../helpers/mock-analytics');
const td = require('testdouble');
const Command = require('../../../lib/models/command');
const RSVP = require('rsvp');
const Promise = RSVP.Promise;
const SilentError = require('silent-error');
const willInterruptProcess = require('../../../lib/utilities/will-interrupt-process');
const MockProcess = require('../../helpers/mock-process');

let ui;
let analytics;
let commands = {};
let isWithinProject;
let project;
let _process;

let CLI;

// helper to similate running the CLI
function ember(args) {
  let cli = new CLI({
    ui,
    analytics,
    testing: true,
  });

  let startInstr = td.replace(cli.instrumentation, 'start');
  let stopInstr = td.replace(cli.instrumentation, 'stopAndReport');

  return cli.run({
    project,
    tasks: {},
    commands,
    cliArgs: args || [],
    settings: {},
  }).then(function(value) {
    td.verify(stopInstr('init'), { times: 1 });
    td.verify(startInstr('command'), { times: 1 });
    td.verify(stopInstr('command', td.matchers.anything(), td.matchers.isA(Array)), { times: 1 });
    td.verify(startInstr('shutdown'), { times: 1 });

    return value;
  });
}

function registerCommand(Command) {
  project.eachAddonCommand = function(callback) {
    callback(Command.name, {
      Command,
    });
  };
}

class MockCaptureExit {
  captureExit(process) {
    this._process = process;
    this._exit = process.exit;
    this._handlers = [];

    process.exit = () => {
      process.exit = this._exit;
      return this._handlers[0]();
    };
  }

  offExit() {
    this._process = null;
    this._handlers = [];
  }

  onExit(cb) {
    this._handlers.push(cb);
  }
}

describe('Unit: CLI', function() {
  this.timeout(200000);
  beforeEach(function() {
    _process = new MockProcess({
      // exit() {
      //   process.exit();
      // },
    });

    willInterruptProcess.capture(_process, new MockCaptureExit());
    CLI = require('../../../lib/cli/cli');
    ui = new MockUI();
    analytics = new MockAnalytics();
    commands = { };
    isWithinProject = true;
    project = {
      isEmberCLIProject() { // similate being inside or outside of a project
        return isWithinProject;
      },
      hasDependencies() {
        return true;
      },
      blueprintLookupPaths() {
        return [];
      },
    };
  });

  afterEach(function() {
    td.reset();

    delete process.env.EMBER_ENV;
    commands = ui = undefined;
    willInterruptProcess.release();
    // process.exit = origExit;
  });

  this.timeout(10000);

  describe('command interruption', function() {
    let interruptionHandeled;

    let deferred;
    beforeEach(function() {
      interruptionHandeled = false;
      deferred = RSVP.defer();
    });

    const FakeCommand = Command.extend({
      name: 'fake',

      beforeRun() {
        return Promise.resolve();
      },

      run() {
        return new Promise(resolve => {
          setTimeout(() => resolve(), 50);
        });
      },

      onInterrupt() {
        setTimeout(() => {
          interruptionHandeled = true;
          console.log('interruptionHandeled');
          deferred.resolve();
        }, 500); // ensure we cleanup longer than command run executed

        return deferred.promise;
      },
    });

    this.timeout(20000000);

    it('works with process.exit', function() {
      registerCommand(FakeCommand);

      let commandResult = ember(['fake']);

      setTimeout(() => {
        _process.exit(1);
      }, 10);

      return commandResult.catch(() => {
        expect(interruptionHandeled).to.equal(true);
      });
    });

    it('sets up handler before command run', function() {
      registerCommand(FakeCommand.extend({
        beforeRun() {
          _process.emit('SIGINT');
        },
      }));

      let r = ember(['fake']);

      return deferred.promise
        .then(() => {
          expect(interruptionHandeled).to.equal(true);
          return r;
        });
    });

    it('cleans up ', function() {
      willInterruptProcess.release();
      willInterruptProcess.capture(new MockProcess({
        platform: 'win',
        stdin: {
          isTTY: true,
        },
      }), new MockCaptureExit());

      registerCommand(FakeCommand.extend({
        run() {
          return new Promise(r => {
            setTimeout(() => {
              _process.stdin.emit('data', [0x03]);
              r();
            }, 50);
          });
        },

        onInterrupt() {
          setTimeout(() => {
            interruptionHandeled = true;
            console.log('interruptionHandeled');
            deferred.resolve();
          }, 1500); // ensure we cleanup longer than command run executed

          return deferred.promise;
        },
      }));

      let r = ember(['fake']);

      return r.then(() => {
        expect(interruptionHandeled).to.equal(true);
      });
    });

    it('cleans up handler right after command is finished', function() {
      registerCommand(FakeCommand.extend({
        onInterrupt() {
          interruptionHandeled = true;
        },
      }));

      return ember(['fake']).finally(function() {
        _process.emit('SIGINT');

        // ensure interruption handler has enough time to be triggered
        return new Promise(resolve => setTimeout(resolve, 50));
      }).then(() => {
        expect(interruptionHandeled).to.equal(false);
      });
    });

    it(`rejected with a proper error on crash`, function() {
      const error = new SilentError('OMG');

      registerCommand(FakeCommand.extend({
        run() {
          throw error;
        },
      }));

      return expect(ember(['fake'])).to.be.rejectedWith(error).then(() => {
        expect(interruptionHandeled).to.equal(false);
      });
    });
  });
});
