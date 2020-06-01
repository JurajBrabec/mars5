const debug = require("debug");
const stream = require("stream");
const { Status } = require("./Status");
const { Parser } = require("./Parser");

class Transform extends stream.Transform {
  constructor(options) {
    options = {
      ...{
        defaultEncoding: "utf8",
        highWaterMark: 2048,
        readableObjectMode: true,
        writableObjectMode: false,
        decodeStrings: false,
      },
      ...options,
    };
    delete options.transform;
    delete options.final;
    super(options);
    delete options.readableObjectMode;
    const source = this.constructor.name;
    const status = new Status();
    status.set({
      source,
      inBytes: 0,
      inLines: 0,
      outObjects: 0,
    });
    const dbg = debug(source);
    options = {
      ...{ parser: new Parser() },
      ...options,
      ...{ dbg, status },
    };
    Object.assign(this, options);
    this.debugEvents();
    return this.once("finish", this.success).once("error", (error) =>
      this.failure(error)
    );
  }
  debugEvents() {
    const dbg = debug(`${this.constructor.name}::event`);
    this.once("close", () => dbg("R:closing"))
      .on("data", (chunk) => dbg("R:data"))
      .once("end", () => dbg("R:ending"))
      .on("pause", () => dbg("R:pausing"))
      .on("resume", () => dbg("R:resuming"))
      .on("drain", () => dbg("W:draining"))
      .on("pipe", (pipe) => dbg("W:piping", pipe.constructor.name))
      .on("unpipe", (pipe) => dbg("W:unpiping", pipe.constructor.name));
    this.dbgEvents = dbg;
    return dbg;
  }
  failure(error) {
    this.dbgEvents("W:error", error);
    let state = "failure";
    if (typeof error === "object") {
      error = {
        code: error.code || error.constructor.name,
        message: error.message,
      };
    }
    this.status.set({ state, error });
    this.emit("failure", this.status.get());
  }
  success() {
    this.dbgEvents("W:finishing");
    let state = "success";
    this.status.set({ state });
    this.emit("success", this.status.get());
  }
  pipe(destination, options) {
    this.status.set({ pipe: destination.status.get() });
    this.off("finish", this.success);
    destination
      .once("success", (status) => {
        this.dbgEvents("W:pipe::success");
        this.status.set({ pipe: status });
        this.success();
      })
      .once("failure", (error) => {
        this.dbgEvents("W:pipe::failure", error);
        this.failure(error);
      });
    return super.pipe(destination, options);
  }
  pushRows(rows) {
    let outObjects = this.status.get("outObjects") + rows.length;
    this.status.set({ outObjects });
    rows.map((row) => this.push(row));
  }
  _transform(chunk, encoding, callback) {
    if (chunk) {
      let { inBytes, inLines } = this.status.get();
      inBytes += chunk.length;
      inLines += chunk.split("\n").length;
      this.status.set({ inBytes, inLines });
    }
    const rows = this.parser.buffer(chunk);
    if (rows) this.pushRows(rows);
    //    return callback();
    return setImmediate(callback);
  }
  _flush(callback) {
    const rows = this.parser.flush();
    if (rows) this.pushRows(rows);
    //    return callback();
    return setImmediate(callback);
  }
}

class BatchInsert extends Transform {
  constructor(options) {
    options = {
      ...{
        tables: null,
      },
      ...options,
    };
    super(options);
  }
  pushRows(rows) {
    this.dbg("pushing", rows.length);
    const batch = this.tables.batchInsert(rows);
    let outObjects = this.status.get("outObjects");
    Object.keys(batch).map((table) => {
      outObjects += batch[table].rows.length;
      this.push(batch[table]);
    });
    this.status.set({ outObjects });
  }
}

class BufferedBatchInsert extends Transform {
  constructor(options) {
    options = {
      ...{
        buffer: {},
        limit: 2048,
        tables: null,
      },
      ...options,
    };
    super(options);
    this.status.set({ outBuffers: 0 });
  }
  pushBuffer(table) {
    this.dbg("pushing", table);
    let outBuffers = this.status.get("outBuffers") + 1;
    this.push(this.buffer[table]);
    this.status.set({ outBuffers });
  }
  pushRows(rows) {
    this.dbg("buffering", rows.length);
    const batch = this.tables.batchInsert(rows);
    let outObjects = this.status.get("outObjects");
    Object.keys(batch).map((table) => {
      outObjects += batch[table].rows.length;
      if (this.buffer[table]) {
        this.buffer[table].rows.concat(batch[table].rows);
      } else {
        this.buffer[table] = batch[table];
      }
      if (this.buffer[table].rows.length >= this.limit) this.pushBuffer(table);
    });
    this.status.set({ outObjects });
  }
  _flush(callback) {
    this.dbg("flushing");
    //    return callback("EE");
    const rows = this.parser.flush();
    if (rows) this.pushRows(rows);
    Object.keys(this.buffer).map((table) => this.pushBuffer(table));
    //    return callback();
    return setImmediate(callback);
  }
}

module.exports = { Transform, BatchInsert, BufferedBatchInsert };

const simplestTransform = new stream.Transform({
  defaultEncoding: "utf8",
  objectMode: true,
  write(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk), encoding);
    callback();
  },
});