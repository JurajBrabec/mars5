const debug = require("debug")("NbuEmitter");
const EmitterProcess = require("../EmitterProcess");
const parser = require("../Parser");
const tables = require("../../lib/Tables");

class Emitter extends EmitterProcess {
  constructor(options = {}) {
    options.debug = options.debug ? true : false;
    if (options.debug) debug.enabled = true;
    options = {
      ...{
        debug: options.debug,
        parser: parser.create(options.command.parser).debug(options.debug),
        tables: tables.create(options.command.tables),
      },
      ...options.command.process,
    };
    super(options);
    this.result = {};
  }
  asBatch(batchSize = 1) {
    debug("asBatch", batchSize);
    tables.asBatch(batchSize);
    return this;
  }
  _data(data) {
    debug("_data", data);
    if (data) {
      this.emit("data", data);
      this.tables.merge(this.result, data);
    }
  }
  data(...data) {
    debug("data", data);
    data = data.join("");
    debug("data", data);
    try {
      this._data(this.tables.assign(JSON.parse(this.parser.parse(data))));
    } catch (error) {
      this.error(`Parsing error: ${error}`);
    }
  }
  end() {
    debug("end");
    this._data(this.tables.end());
    super.end();
  }
}

module.exports = Emitter;