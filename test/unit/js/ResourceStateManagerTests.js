/* eslint-disable
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SandboxedModule = require('sandboxed-module');
const sinon = require('sinon');
const should = require('chai').should();
const modulePath = require('path').join(__dirname, '../../../app/js/ResourceStateManager');
const Path = require("path");
const Errors = require("../../../app/js/Errors");

describe("ResourceStateManager", function() {
	beforeEach(function() {
		this.ResourceStateManager = SandboxedModule.require(modulePath, { requires: {
			"fs": (this.fs = {}),
			"logger-sharelatex": {log: sinon.stub(), err: sinon.stub()},
			"./SafeReader": (this.SafeReader = {})
		}
	});
		this.basePath = "/path/to/write/files/to";
		this.resources = [
			{path: "resource-1-mock"},
			{path: "resource-2-mock"},
			{path: "resource-3-mock"}
		];
		this.state = "1234567890";
		this.resourceFileName = `${this.basePath}/.project-sync-state`;
		this.resourceFileContents = `${this.resources[0].path}\n${this.resources[1].path}\n${this.resources[2].path}\nstateHash:${this.state}`;
		return this.callback = sinon.stub();
	});

	describe("saveProjectState", function() {
		beforeEach(function() {
			return this.fs.writeFile = sinon.stub().callsArg(2);
		});

		describe("when the state is specified", function() {
			beforeEach(function() {
				return this.ResourceStateManager.saveProjectState(this.state, this.resources, this.basePath, this.callback);
			});

			it("should write the resource list to disk", function() {
				return this.fs.writeFile
					.calledWith(this.resourceFileName, this.resourceFileContents)
					.should.equal(true);
			});

			return it("should call the callback", function() {
				return this.callback.called.should.equal(true);
			});
		});

		return describe("when the state is undefined", function() {
			beforeEach(function() {
				this.state = undefined;
				this.fs.unlink = sinon.stub().callsArg(1);
				return this.ResourceStateManager.saveProjectState(this.state, this.resources, this.basePath, this.callback);
			});

			it("should unlink the resource file", function() {
				return this.fs.unlink
					.calledWith(this.resourceFileName)
					.should.equal(true);
			});

			it("should not write the resource list to disk", function() {
				return this.fs.writeFile.called.should.equal(false);
			});

			return it("should call the callback", function() {
				return this.callback.called.should.equal(true);
			});
		});
	});

	describe("checkProjectStateMatches", function() {

		describe("when the state matches", function() {
			beforeEach(function() {
				this.SafeReader.readFile = sinon.stub().callsArgWith(3, null, this.resourceFileContents);
				return this.ResourceStateManager.checkProjectStateMatches(this.state, this.basePath, this.callback);
			});

			it("should read the resource file", function() {
				return this.SafeReader.readFile
					.calledWith(this.resourceFileName)
					.should.equal(true);
			});

			return it("should call the callback with the results", function() {
				return this.callback.calledWithMatch(null, this.resources).should.equal(true);
			});
		});

		return describe("when the state does not match", function() {
			beforeEach(function() {
				this.SafeReader.readFile = sinon.stub().callsArgWith(3, null, this.resourceFileContents);
				return this.ResourceStateManager.checkProjectStateMatches("not-the-original-state", this.basePath, this.callback);
			});

			return it("should call the callback with an error", function() {
				const error = new Errors.FilesOutOfSyncError("invalid state for incremental update");
				return this.callback.calledWith(error).should.equal(true);
			});
		});
	});

	return describe("checkResourceFiles", function() {
		describe("when all the files are present", function() {
			beforeEach(function() {
				this.allFiles = [ this.resources[0].path, this.resources[1].path, this.resources[2].path];
				return this.ResourceStateManager.checkResourceFiles(this.resources, this.allFiles, this.basePath, this.callback);
			});

			return it("should call the callback", function() {
				return this.callback.calledWithExactly().should.equal(true);
			});
		});

		describe("when there is a missing file", function() {
			beforeEach(function() {
				this.allFiles = [ this.resources[0].path, this.resources[1].path];
				this.fs.stat = sinon.stub().callsArgWith(1, new Error());
				return this.ResourceStateManager.checkResourceFiles(this.resources, this.allFiles, this.basePath, this.callback);
			});

			return it("should call the callback with an error", function() {
				const error = new Errors.FilesOutOfSyncError("resource files missing in incremental update");
				return this.callback.calledWith(error).should.equal(true);
			});
		});

		return describe("when a resource contains a relative path", function() {
			beforeEach(function() {
				this.resources[0].path = "../foo/bar.tex";
				this.allFiles = [ this.resources[0].path, this.resources[1].path, this.resources[2].path];
				return this.ResourceStateManager.checkResourceFiles(this.resources, this.allFiles, this.basePath, this.callback);
			});

			return it("should call the callback with an error", function() {
				return this.callback.calledWith(new Error("relative path in resource file list")).should.equal(true);
			});
		});
	});
});

