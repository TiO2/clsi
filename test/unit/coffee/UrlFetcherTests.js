SandboxedModule = require('sandboxed-module')
sinon = require('sinon')
require('chai').should()
modulePath = require('path').join __dirname, '../../../app/js/UrlFetcher'
EventEmitter = require("events").EventEmitter

describe "UrlFetcher", ->
	beforeEach ->
		@callback = sinon.stub()
		@url = "https://www.example.com/file/here?query=string"
		@UrlFetcher = SandboxedModule.require modulePath, requires:
			request: defaults: @defaults = sinon.stub().returns(@request = {})
			fs: @fs = {}
			"logger-sharelatex": @logger = { log: sinon.stub(), error: sinon.stub() }
			"settings-sharelatex": @settings = {}

	it "should turn off the cookie jar in request", ->
		@defaults.calledWith(jar: false)
			.should.equal true

	describe "rewrite url domain if filestoreDomainOveride is set", ->
		beforeEach ->
			@path = "/path/to/file/on/disk"
			@request.get = sinon.stub().returns(@urlStream = new EventEmitter)
			@urlStream.pipe = sinon.stub()
			@urlStream.pause = sinon.stub()
			@urlStream.resume = sinon.stub()
			@fs.createWriteStream = sinon.stub().returns(@fileStream = new EventEmitter)
			@fs.unlink = (file, callback) -> callback()

		it "should use the normal domain when override not set", (done)->
			@UrlFetcher.pipeUrlToFile @url, @path, =>
				@request.get.args[0][0].url.should.equal @url
				done()
			@res = statusCode: 200
			@urlStream.emit "response", @res
			@urlStream.emit "end"
			@fileStream.emit "finish"


		it "should use override domain when filestoreDomainOveride is set", (done)->
			@settings.filestoreDomainOveride = "192.11.11.11"
			@UrlFetcher.pipeUrlToFile @url, @path, =>
				@request.get.args[0][0].url.should.equal "192.11.11.11/file/here?query=string"
				done()
			@res = statusCode: 200
			@urlStream.emit "response", @res
			@urlStream.emit "end"
			@fileStream.emit "finish"

	describe "pipeUrlToFile", ->
		beforeEach (done)->
			@path = "/path/to/file/on/disk"
			@request.get = sinon.stub().returns(@urlStream = new EventEmitter)
			@urlStream.pipe = sinon.stub()
			@urlStream.pause = sinon.stub()
			@urlStream.resume = sinon.stub()
			@fs.createWriteStream = sinon.stub().returns(@fileStream = new EventEmitter)
			@fs.unlink = (file, callback) -> callback()
			done()

		describe "successfully", ->
			beforeEach (done)->
				@UrlFetcher.pipeUrlToFile @url, @path, =>
					@callback()
					done()
				@res = statusCode: 200
				@urlStream.emit "response", @res
				@urlStream.emit "end"
				@fileStream.emit "finish"


			it "should request the URL", ->
				@request.get
					.calledWith(sinon.match {"url": @url})
					.should.equal true

			it "should open the file for writing", ->
				@fs.createWriteStream
					.calledWith(@path)
					.should.equal true

			it "should pipe the URL to the file", ->
				@urlStream.pipe
					.calledWith(@fileStream)
					.should.equal true
		
			it "should call the callback", ->
				@callback.called.should.equal true

		describe "with non success status code", ->
			beforeEach (done)->
				@UrlFetcher.pipeUrlToFile @url, @path, (err)=>
					@callback(err)
					done()	
				@res = statusCode: 404
				@urlStream.emit "response", @res
				@urlStream.emit "end"

			it "should call the callback with an error", ->
				@callback
					.calledWith(new Error("URL returned non-success status code: 404"))
					.should.equal true

		describe "with error", ->
			beforeEach (done)->
				@UrlFetcher.pipeUrlToFile @url, @path, (err)=>
					@callback(err)
					done()
				@urlStream.emit "error", @error = new Error("something went wrong")

			it "should call the callback with the error", ->
				@callback
					.calledWith(@error)
					.should.equal true

			it "should only call the callback once, even if end is called", ->
				@urlStream.emit "end"
				@callback.calledOnce.should.equal true

