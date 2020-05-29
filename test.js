//if (require.main === module) testMars();

async function testMars() {
  const { nbu } = require("./lib/netBackup");
  const util = require("util");
  const { Database } = require("./lib/Database");
  const database = new Database();
  try {
    console.log(await database.test());
    await nbu.init();
    const source = nbu.vaults();
    console.log(await source.test());
    source.on("progress", console.log);
    //const result = await source.asObjects();
    const result = await source.toDatabase(database);
    console.log("Result:");
    console.log(util.inspect(result, false, null, true));
    console.log("Status:");
    console.log(util.inspect(source.status, false, null, true));
  } catch (err) {
    if (
      err instanceof SyntaxError ||
      err instanceof ReferenceError ||
      err instanceof TypeError
    )
      throw err;
    console.log("Error: " + err.message);
  } finally {
    await database.pool.end();
  }
}

const dotenv = require("dotenv").config();
const { emitter, readable, writable, parser } = require("./lib/TextParsers");
const { Tables } = require("./lib/Tables");
const { Database } = require("./lib/Database");

function testSync(Object, params, callback) {
  const object = new Object(params.options, params.func);
  if (params.pipe) {
    object.pipe(params.pipe);
  } else if (params.onData) object.on("data", params.onData);
  object
    .execute(params.args)
    .then(params.onResult)
    .catch(params.onError)
    .finally(() => {
      params.onStatus(object.status);
      if (callback) callback();
    });
}
async function testAsync(Object, params, callback) {
  const object = new Object(params.options, params.func);
  if (params.pipe) {
    object.pipe(params.pipe);
  } else if (params.onData) {
    object.on("data", params.onData);
  }
  try {
    const result = await object.execute(params.args);
    params.onResult(result);
  } catch (error) {
    params.onError(error);
  } finally {
    params.onStatus(object.status);
    if (callback) callback();
  }
}
function onData(data) {
  console.log(data);
}
function onResult(result) {
  console.log("Result:");
  console.log(result);
}
function onError(error) {
  console.log("Error:");
  console.log(error);
}
function onStatus(status) {
  console.log("Status:");
  console.log(status);
}

function test(aSync, objectMode, SourceClass, DestinationClass) {
  console.log(
    `\nTesting ${aSync ? "a" : ""}sync ${objectMode ? "object" : "string"} '${
      SourceClass.name
    }'${
      DestinationClass
        ? ` piped to '${
            DestinationClass === process.stdout
              ? "stdout"
              : DestinationClass.name
          }'`
        : ""
    }...`
  );
  let endFunc;
  const params = {
    options: {},
    pipe: undefined,
    onData,
    onResult,
    onError,
    onStatus,
  };
  let options;
  let func;
  if (objectMode) {
    params.options = { objectMode };
    params.args = { name: "John" };
    options = { objectMode };
  } else {
    params.options = { encoding: "utf8" };
    params.args = "John";
    options = { defaultEncoding: "utf8", decodeStrings: false };
  }
  try {
    switch (SourceClass) {
      case emitter.Command:
        break;
      case emitter.Function:
        params.func = function (success, failure, args) {
          success(args);
        };
        break;
      case readable.Function:
        params.func = function (push, success, failure, args) {
          for (let i = 1; i < 3; i++) push(args);
          success();
        };
        break;
      case emitter.File:
      case readable.File:
        params.options.fileName = "./package.json";
        break;
      case emitter.Process:
      case readable.Process:
        params.options.command = "dir";
        params.options.args = ["-s"];
        break;
      case emitter.Sql:
      case readable.Sql:
        params.options.database = new Database();
        params.options.sql = "select * from bpdbjobs_summary;";
        endFunc = () => params.options.database.pool.end();
        break;
    }
    switch (DestinationClass) {
      case undefined:
      case process.stdout:
      case writable.Writable:
        break;
      case writable.Function:
        func = function (chunk, encoding, success, failure) {
          console.log(encoding, chunk);
          return success();
        };
        break;
      case writable.File:
        options.fileName = "./test.txt";
        break;
      case writable.Sql:
        options.database = new Database();
        options.sql = "insert into test (name) values (:name);";
        endFunc = () => options.database.pool.end();
        break;
    }
    switch (SourceClass) {
      case readable.Readable:
      case readable.Function:
      case readable.File:
      case readable.Process:
      case readable.Sql:
        let destination;
        switch (DestinationClass) {
          case undefined:
          case process.stdout:
            destination = DestinationClass;
            break;
          case writable.Writable:
          case writable.Function:
          case writable.File:
          case writable.Sql:
            destination = new DestinationClass(options, func);
            break;
        }
        if (destination) params.pipe = destination;
        break;
    }
    const testFunc = aSync ? testAsync : testSync;
    return testFunc(SourceClass, params, endFunc);
  } catch (error) {
    console.log("Error:", error);
  }
}

function allTests(aSync) {
  [
    emitter.Command,
    emitter.Function,
    emitter.File,
    emitter.Process,
    emitter.Sql,
  ].forEach((Source) => {
    //      test(aSync, true, Source);
    //      test(aSync, false, Source);
  });
  [
    readable.Readable,
    readable.Function,
    readable.File,
    readable.Process,
    readable.Sql,
  ].forEach((Source) => {
    [
      undefined,
      process.stdout,
      writable.Writable,
      writable.Function,
      writable.Sql,
    ].forEach((Destination) => {
      test(aSync, true, Source, Destination);
      //        test(aSync, false, Source, Destination);
    });
  });
  console.log("\nDone.\n");
}

const aSync = true;
//const aSync = true;
const objectMode = true;
//const objectMode = true;

//test(aSync, objectMode, Readable.Function, Writable.Sql);
//allTests(aSync);

function testParser() {
  class CT1 extends parser.Parser {
    chain = (source) =>
      source
        .expect(/^ITEM/)
        .split(/^(?:ITEM)/m)
        .trim()
        .split(/(?:\nSUBITEM)/m)
        .trim()
        .separate(" ")
        .unpivot()
        .ucase()
        .get();
  }
  let text = `ITEM a0 b0 c0\n`;
  text += `SUBITEM d e f\n`;
  text += `SUBITEM g h i\n`;
  text += `ITEM a1 b1 c1\n`;
  text += `SUBITEM d e f\n`;
  text += `SUBITEM g h i\n`;

  const ct = new CT1();

  let result;
  try {
    result = ct.parse(text);
  } catch (error) {
    result = error;
  }
  console.log(result);
  console.log(
    `Level:${ct.level} Groups:${ct.groups} Rows:${ct.rowsTotal} (${ct.rows}/group) Fields:${ct.fields} Duration:${ct.elapsed}ms`
  );
}
//testParser();

function testLiteralStrings() {
  function literalString(strings, ...params) {
    return { strings, params };
  }
  const p1 = "p1";
  const p2 = "p2";
  const s = literalString`s1 ${p1} s2 ${p2} s3`;
  console.log({ s });
}

function testNew() {
  const t1 = {
    table1: [
      { field1: /^(\w+)/, key: true },
      { field2: / (\w+)/, key: true },
    ],
  };
  const t2 = {
    table2: [
      { field1: "string", key: true },
      { field2: "string", key: true },
    ],
  };
  const t3 = {
    table3: [{ field1: "number", key: true }, { field2: "number" }],
  };

  const output = `aa bb 11\ncc dd 22\nee ff 33`;
  const rows1 = new parser.Parser(output).split("\n").match(new Tables(t1));
  const rows2 = new parser.Parser(output)
    .split("\n")
    .split(" ")
    .assign(new Tables([t2, t3]));

  console.log("\nTransformed rows:");
  console.log(rows1);
  console.log(rows2);
}

function example() {
  let text = `#name,age,points
John,33,145
Peter,25,29`;

  console.log(text);

  let result = new parser.Parser(text)
    .split("\n")
    .filter(/#/)
    .separate(",")
    .expect(3)
    .get();

  console.log(result);
}

function testTransform() {
  const table1 = {
    table1: [{ name: "string", key: true }, { age: "number" }],
  };
  const table2 = {
    table2: [{ points: "number" }, { level: "number" }],
  };

  let text = `#name,age,points
John,33,145
Peter,25,29`;

  const stream = require("stream");
  const myReadable = new stream.Readable({
    encoding: "utf8",
    objectMode: false,
    read() {
      for (let i = 0; i < 10; i++) {
        this.push(text);
      }
      this.push(null);
    },
    destroy(error, callback) {
      callback(error);
    },
  });

  const myTransform = new parser.Transform({
    parser: new parser.Parser((source) =>
      source
        .split("\n")
        .filter(/#/)
        .separate(",")
        .expect(3)
        .assign(new Tables([table1, table2]))
    ),
  });

  const myWritable = new stream.Writable({
    defaultEncoding: "utf8",
    objectMode: true,
    write(chunk, encoding, callback) {
      console.log(chunk);
      callback();
    },
  });

  myReadable.pipe(myTransform).pipe(myWritable);
}
testTransform();