'use strict';

var expect     = require('chai').expect;
var MockUI     = require('../../helpers/mock-ui');
var BowerTask = require('../../../lib/tasks/bower-task');
var bower;

describe('bower task', function() {
  var ui;

  var testCalledWith, testCalled;

  var Bower = function() {
    // auto resolved on 'end' event with reject
    this.on = function(eventName, callback) {
      if (eventName === 'end') {
        callback(this);
      } else if (eventName === 'log') {
        callback({
          id: 'bower-message-id',
          message: 'logged message',
          level: 'info'
        });
      }
      return this;
    }.bind(this);

    var testCommand = function(args) {
      testCalled = true;
      testCalledWith = args;
      return this;
    }.bind(this);

    return {
      on: this.on,
      commands: {
        test: testCommand
      }
    };
  };

  describe('existent command', function() {
    beforeEach(function() {
      testCalled = false;
      testCalledWith = undefined;
      bower = new Bower();
    });

    it('without arguments', function() {
      ui = new MockUI();

      var task = new BowerTask({
        command: 'test',
        startProgressMessage: 'test started',
        completionMessage: 'test completed',
        ui: ui,
        bower: bower
      });

      return task.run({}).then(function() {
        expect(ui.output).to.include('test completed');

        // @todo: should be an empty array
        expect(testCalledWith).to.deep.equal([]);
      });
    });

    it('with --dry-run', function() {
      ui = new MockUI();

      var task = new BowerTask({
        command: 'test',
        startProgressMessage: 'test started',
        completionMessage: 'test completed',
        ui: ui,
        bower: bower
      });

      return task.run({
        dryRun: true
      }).then(function() {
        expect(testCalled).to.equal(false);
      });
    });

    it('with --verbose', function() {
      ui = new MockUI();

      var task = new BowerTask({
        command: 'test',
        startProgressMessage: 'test started',
        completionMessage: 'test completed',
        ui: ui,
        bower: bower
      });

      return task.run({
        verbose: true
      }).then(function() {
        expect(ui.output).to.include('logged message');
      });
    });

  });

  it('non-existent command without arguments', function() {
    var expectedErrorMessage = '`bower non-existent` not found';
    bower = new Bower();
    ui = new MockUI();

    var task = new BowerTask({
      command: 'non-existent',
      startProgressMessage: 'test started',
      completionMessage: 'test completed',
      ui: ui,
      bower: bower
    });

    return task.run({}).catch(function() {
      expect(ui.output).to.include(expectedErrorMessage);
    });
  });
});

