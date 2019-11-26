const { equal } = require("assert");
const index = require('../lib.js');

describe('string matching', function() {
  describe('index', function() {
    it('should return expected string', function() {
        equal(index(), "programmatic example");
    });
  });
});
