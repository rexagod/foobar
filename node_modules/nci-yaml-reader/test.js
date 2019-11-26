'use strict';

var expect = require('expect.js'),
	sinon = require('sinon'),
	rewire = require('rewire'),
	plugin = rewire('./lib'),
	yaml = require('js-yaml'),
	schema = plugin.__get__('schema');

describe('Plugin', function() {
	function BaseReaderLoader() {
	}

	var registerSpy = sinon.stub(),
		app = {
			lib: {
				reader: {
					register: registerSpy, BaseReaderLoader: BaseReaderLoader
				}
			}
		};

	var constructor;

	describe('register', function() {
		it('without errors', function() {
			plugin.register(app);
		});

		it('called once', function() {
			expect(registerSpy.calledOnce).equal(true);
		});

		it('with ext', function() {
			expect(registerSpy.getCall(0).args[0]).eql('yaml');
		});

		it('with constructor', function() {
			constructor = registerSpy.getCall(0).args[1];
			expect(constructor).a('function');
			expect(constructor.prototype).a(app.lib.reader.BaseReaderLoader);
			expect(constructor.prototype._load).a('function');
		});
	});

	describe('load', function() {
		var makeSpies = function(params) {
			return {
				resultCallback: sinon.stub(),
				fsReadFile: sinon.stub().callsArgWithAsync(
					2, params.readFileError || null, params.yamlText
				),
				yamlLoad: (
					params.loadedJson ? sinon.stub().returns(params.loadedJson) :
						sinon.stub().throws(params.yamlLoadError)
				)
			};
		};

		var setSpies = function(spies) {
			return plugin.__set__({
				fs: {readFile: spies.fsReadFile},
				yaml: {load: spies.yamlLoad}
			});
		};

		var loader, spies, revertSpies;

		var spiesParams;

		var initBeforeHook = function() {
			loader = new constructor();
			spies = makeSpies(spiesParams);
			revertSpies = setSpies(spies);
		};

		var afterHook = function() {
			revertSpies();
		};

		describe('with correct params', function() {
			before(function() {
				spiesParams = {
					yamlText: 'yaml text',
					loadedJson: {json: true}
				};
				initBeforeHook();
			});

			it('should be done without sync errors', function() {
				loader._load('/tmp', 'test', spies.resultCallback);
			});

			it('should call read file with proper args', function() {
				expect(spies.fsReadFile.calledOnce).equal(true);
				expect(spies.fsReadFile.getCall(0).args[0]).equal('/tmp/test.yaml');
				expect(spies.fsReadFile.getCall(0).args[1]).equal('utf8');
			});

			it('shuold call yaml load with proper args', function() {
				expect(spies.yamlLoad.calledOnce).equal(true);
				var yamlLoadCall = spies.yamlLoad.getCall(0);
				expect(yamlLoadCall.args[0]).equal(spiesParams.yamlText);
				expect(yamlLoadCall.args[1]).eql({schema: schema});
			});

			it('should call result callback without error', function() {
				expect(spies.resultCallback.calledOnce).equal(true);
				expect(spies.resultCallback.getCall(0).args[0]).not.ok();
			});

			it('should call result callback with proper json', function() {
				expect(spies.resultCallback.getCall(0).args[0]).not.ok();
			});

			after(afterHook);
		});

		describe('with read file error', function() {
			before(function() {
				spiesParams = {
					readFileError: new Error('read file error')
				};
				initBeforeHook();
			});

			it('should be done without sync errors', function() {
				loader._load('/tmp', 'test', spies.resultCallback);
			});

			it('should call result callback with that error', function() {
				expect(spies.resultCallback.calledOnce).equal(true);
				var err = spies.resultCallback.getCall(0).args[0];
				expect(err).ok();
				expect(err).a(Error);
				expect(err.message).equal(spiesParams.readFileError.message);
			});

			after(afterHook);
		});

		describe('with yaml load error', function() {
			before(function() {
				spiesParams = {
					yamlLoadError: new Error('yaml load error')
				};
				initBeforeHook();
			});

			it('should be done without sync errors', function() {
				loader._load('/tmp', 'test', spies.resultCallback);
			});

			it('should call result callback with that error', function() {
				expect(spies.resultCallback.calledOnce).equal(true);
				var err = spies.resultCallback.getCall(0).args[0];
				expect(err).ok();
				expect(err).a(Error);
				expect(err.message).equal(spiesParams.yamlLoadError.message);
			});

			after(afterHook);
		});
	});
});

describe('yaml load with such settings', function() {
	var yamlLoad = function(text) {
		return yaml.load(text, {schema: schema});
	};

	it('should correctly parse basic structures', function() {
		var json = yamlLoad([
			'a: 1',
			'b: {c: 2}',
			'd: [1, 2, 3]',
			'e:',
			'  - 1',
			'  - 2',
			'  - 3',
			'f:',
			'  a: 1',
			'  b: 2',
			'  c: 3',
			'g: >',
			'  multiline',
			'  string'
		].join('\n'));

		expect(json).eql({
			a: 1,
			b: { c: 2 },
			d: [ 1, 2, 3 ],
			e: [ 1, 2, 3 ],
			f: { a: 1, b: 2, c: 3 },
			g: 'multiline string\n'
		});
	});

	it('should correctly parse regexp', function() {
		expect(String(yamlLoad('!!js/regexp /[a-z]+/'))).eql(String(/[a-z]+/));
		expect(String(yamlLoad('!!js/regexp ^[a-z]+'))).eql(String(/^[a-z]+/));
	});

	it('should correctly parse functions', function() {
		expect(
			String(yamlLoad('!!js/function \'function(){return 123;}\''))
		).eql(
			'function anonymous() {\nreturn 123;\n}'
		);
	});

	it('should correctly parse env vars', function() {
		expect(function() {
			yamlLoad('!env HOME');
		}).throwException(/cannot resolve a node with !<!env> explicit tag/);

		var home = process.env.HOME;
		expect(String(yamlLoad('!env $HOME'))).eql(home);

		expect(String(yamlLoad('!env $HOME/tmp'))).eql(home + '/tmp');

		var lcName = process.env.LC_NAME;
		expect(String(yamlLoad('!env $HOME and $LC_NAME'))).eql(
			home + ' and ' + lcName
		);
	});

});
