var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports2, module2) {
    var fs5 = require("fs");
    var path4 = require("path");
    var os = require("os");
    var crypto2 = require("crypto");
    var TIPS = [
      "\u25C8 encrypted .env [www.dotenvx.com]",
      "\u25C8 secrets for agents [www.dotenvx.com]",
      "\u2301 auth for agents [www.vestauth.com]",
      "\u2318 custom filepath { path: '/custom/path/.env' }",
      "\u2318 enable debugging { debug: true }",
      "\u2318 override existing { override: true }",
      "\u2318 suppress logs { quiet: true }",
      "\u2318 multiple files { path: ['.env.local', '.env'] }"
    ];
    function _getRandomTip() {
      return TIPS[Math.floor(Math.random() * TIPS.length)];
    }
    function parseBoolean(value) {
      if (typeof value === "string") {
        return !["false", "0", "no", "off", ""].includes(value.toLowerCase());
      }
      return Boolean(value);
    }
    function supportsAnsi() {
      return process.stdout.isTTY;
    }
    function dim(text) {
      return supportsAnsi() ? `\x1B[2m${text}\x1B[0m` : text;
    }
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      const vaultPath = _vaultPath(options);
      options.path = vaultPath;
      const result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i2 = 0; i2 < length; i2++) {
        try {
          const key = keys[i2].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i2 + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.error(`\u26A0 ${message}`);
    }
    function _debug(message) {
      console.log(`\u2506 ${message}`);
    }
    function _log(message) {
      console.log(`\u25C7 ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs5.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path4.resolve(process.cwd(), ".env.vault");
      }
      if (fs5.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path4.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options && options.debug);
      const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (debug || !quiet) {
        _log("loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path4.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options && options.debug);
      let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options && options.quiet);
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("no encoding is specified (UTF-8 is used by default)");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError2;
      const parsedAll = {};
      for (const path5 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs5.readFileSync(path5, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e2) {
          if (debug) {
            _debug(`failed to load ${path5} ${e2.message}`);
          }
          lastError2 = e2;
        }
      }
      const populated = DotenvModule.populate(processEnv, parsedAll, options);
      debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug);
      quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
      if (debug || !quiet) {
        const keysCount = Object.keys(populated).length;
        const shortPaths = [];
        for (const filePath of optionPaths) {
          try {
            const relative = path4.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e2) {
            if (debug) {
              _debug(`failed to load ${filePath} ${e2.message}`);
            }
            lastError2 = e2;
          }
        }
        _log(`injected env (${keysCount}) from ${shortPaths.join(",")} ${dim(`// tip: ${_getRandomTip()}`)}`);
      }
      if (lastError2) {
        return { parsed: parsedAll, error: lastError2 };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`you set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto2.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      const populated = {};
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
            populated[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
          populated[key] = parsed[key];
        }
      }
      return populated;
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config,
      decrypt,
      parse,
      populate
    };
    module2.exports.configDotenv = DotenvModule.configDotenv;
    module2.exports._configVault = DotenvModule._configVault;
    module2.exports._parseVault = DotenvModule._parseVault;
    module2.exports.config = DotenvModule.config;
    module2.exports.decrypt = DotenvModule.decrypt;
    module2.exports.parse = DotenvModule.parse;
    module2.exports.populate = DotenvModule.populate;
    module2.exports = DotenvModule;
  }
});

// node_modules/dotenv/lib/env-options.js
var require_env_options = __commonJS({
  "node_modules/dotenv/lib/env-options.js"(exports2, module2) {
    var options = {};
    if (process.env.DOTENV_CONFIG_ENCODING != null) {
      options.encoding = process.env.DOTENV_CONFIG_ENCODING;
    }
    if (process.env.DOTENV_CONFIG_PATH != null) {
      options.path = process.env.DOTENV_CONFIG_PATH;
    }
    if (process.env.DOTENV_CONFIG_QUIET != null) {
      options.quiet = process.env.DOTENV_CONFIG_QUIET;
    }
    if (process.env.DOTENV_CONFIG_DEBUG != null) {
      options.debug = process.env.DOTENV_CONFIG_DEBUG;
    }
    if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
      options.override = process.env.DOTENV_CONFIG_OVERRIDE;
    }
    if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
      options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY;
    }
    module2.exports = options;
  }
});

// node_modules/dotenv/lib/cli-options.js
var require_cli_options = __commonJS({
  "node_modules/dotenv/lib/cli-options.js"(exports2, module2) {
    var re = /^dotenv_config_(encoding|path|quiet|debug|override|DOTENV_KEY)=(.+)$/;
    module2.exports = function optionMatcher(args) {
      const options = args.reduce(function(acc, cur) {
        const matches = cur.match(re);
        if (matches) {
          acc[matches[1]] = matches[2];
        }
        return acc;
      }, {});
      if (!("quiet" in options)) {
        options.quiet = "true";
      }
      return options;
    };
  }
});

// node_modules/web-streams-polyfill/dist/ponyfill.es2018.js
var require_ponyfill_es2018 = __commonJS({
  "node_modules/web-streams-polyfill/dist/ponyfill.es2018.js"(exports2, module2) {
    (function(global2, factory) {
      typeof exports2 === "object" && typeof module2 !== "undefined" ? factory(exports2) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.WebStreamsPolyfill = {}));
    })(exports2, (function(exports3) {
      "use strict";
      function noop2() {
        return void 0;
      }
      function typeIsObject(x2) {
        return typeof x2 === "object" && x2 !== null || typeof x2 === "function";
      }
      const rethrowAssertionErrorRejection = noop2;
      function setFunctionName(fn, name) {
        try {
          Object.defineProperty(fn, "name", {
            value: name,
            configurable: true
          });
        } catch (_a2) {
        }
      }
      const originalPromise = Promise;
      const originalPromiseThen = Promise.prototype.then;
      const originalPromiseReject = Promise.reject.bind(originalPromise);
      function newPromise(executor) {
        return new originalPromise(executor);
      }
      function promiseResolvedWith(value) {
        return newPromise((resolve) => resolve(value));
      }
      function promiseRejectedWith(reason) {
        return originalPromiseReject(reason);
      }
      function PerformPromiseThen(promise, onFulfilled, onRejected) {
        return originalPromiseThen.call(promise, onFulfilled, onRejected);
      }
      function uponPromise(promise, onFulfilled, onRejected) {
        PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
      }
      function uponFulfillment(promise, onFulfilled) {
        uponPromise(promise, onFulfilled);
      }
      function uponRejection(promise, onRejected) {
        uponPromise(promise, void 0, onRejected);
      }
      function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
        return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
      }
      function setPromiseIsHandledToTrue(promise) {
        PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
      }
      let _queueMicrotask = (callback) => {
        if (typeof queueMicrotask === "function") {
          _queueMicrotask = queueMicrotask;
        } else {
          const resolvedPromise = promiseResolvedWith(void 0);
          _queueMicrotask = (cb) => PerformPromiseThen(resolvedPromise, cb);
        }
        return _queueMicrotask(callback);
      };
      function reflectCall(F2, V, args) {
        if (typeof F2 !== "function") {
          throw new TypeError("Argument is not a function");
        }
        return Function.prototype.apply.call(F2, V, args);
      }
      function promiseCall(F2, V, args) {
        try {
          return promiseResolvedWith(reflectCall(F2, V, args));
        } catch (value) {
          return promiseRejectedWith(value);
        }
      }
      const QUEUE_MAX_ARRAY_SIZE = 16384;
      class SimpleQueue {
        constructor() {
          this._cursor = 0;
          this._size = 0;
          this._front = {
            _elements: [],
            _next: void 0
          };
          this._back = this._front;
          this._cursor = 0;
          this._size = 0;
        }
        get length() {
          return this._size;
        }
        // For exception safety, this method is structured in order:
        // 1. Read state
        // 2. Calculate required state mutations
        // 3. Perform state mutations
        push(element) {
          const oldBack = this._back;
          let newBack = oldBack;
          if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
            newBack = {
              _elements: [],
              _next: void 0
            };
          }
          oldBack._elements.push(element);
          if (newBack !== oldBack) {
            this._back = newBack;
            oldBack._next = newBack;
          }
          ++this._size;
        }
        // Like push(), shift() follows the read -> calculate -> mutate pattern for
        // exception safety.
        shift() {
          const oldFront = this._front;
          let newFront = oldFront;
          const oldCursor = this._cursor;
          let newCursor = oldCursor + 1;
          const elements = oldFront._elements;
          const element = elements[oldCursor];
          if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
            newFront = oldFront._next;
            newCursor = 0;
          }
          --this._size;
          this._cursor = newCursor;
          if (oldFront !== newFront) {
            this._front = newFront;
          }
          elements[oldCursor] = void 0;
          return element;
        }
        // The tricky thing about forEach() is that it can be called
        // re-entrantly. The queue may be mutated inside the callback. It is easy to
        // see that push() within the callback has no negative effects since the end
        // of the queue is checked for on every iteration. If shift() is called
        // repeatedly within the callback then the next iteration may return an
        // element that has been removed. In this case the callback will be called
        // with undefined values until we either "catch up" with elements that still
        // exist or reach the back of the queue.
        forEach(callback) {
          let i2 = this._cursor;
          let node = this._front;
          let elements = node._elements;
          while (i2 !== elements.length || node._next !== void 0) {
            if (i2 === elements.length) {
              node = node._next;
              elements = node._elements;
              i2 = 0;
              if (elements.length === 0) {
                break;
              }
            }
            callback(elements[i2]);
            ++i2;
          }
        }
        // Return the element that would be returned if shift() was called now,
        // without modifying the queue.
        peek() {
          const front = this._front;
          const cursor = this._cursor;
          return front._elements[cursor];
        }
      }
      const AbortSteps = Symbol("[[AbortSteps]]");
      const ErrorSteps = Symbol("[[ErrorSteps]]");
      const CancelSteps = Symbol("[[CancelSteps]]");
      const PullSteps = Symbol("[[PullSteps]]");
      const ReleaseSteps = Symbol("[[ReleaseSteps]]");
      function ReadableStreamReaderGenericInitialize(reader, stream) {
        reader._ownerReadableStream = stream;
        stream._reader = reader;
        if (stream._state === "readable") {
          defaultReaderClosedPromiseInitialize(reader);
        } else if (stream._state === "closed") {
          defaultReaderClosedPromiseInitializeAsResolved(reader);
        } else {
          defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
        }
      }
      function ReadableStreamReaderGenericCancel(reader, reason) {
        const stream = reader._ownerReadableStream;
        return ReadableStreamCancel(stream, reason);
      }
      function ReadableStreamReaderGenericRelease(reader) {
        const stream = reader._ownerReadableStream;
        if (stream._state === "readable") {
          defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
        } else {
          defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
        }
        stream._readableStreamController[ReleaseSteps]();
        stream._reader = void 0;
        reader._ownerReadableStream = void 0;
      }
      function readerLockException(name) {
        return new TypeError("Cannot " + name + " a stream using a released reader");
      }
      function defaultReaderClosedPromiseInitialize(reader) {
        reader._closedPromise = newPromise((resolve, reject) => {
          reader._closedPromise_resolve = resolve;
          reader._closedPromise_reject = reject;
        });
      }
      function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
        defaultReaderClosedPromiseInitialize(reader);
        defaultReaderClosedPromiseReject(reader, reason);
      }
      function defaultReaderClosedPromiseInitializeAsResolved(reader) {
        defaultReaderClosedPromiseInitialize(reader);
        defaultReaderClosedPromiseResolve(reader);
      }
      function defaultReaderClosedPromiseReject(reader, reason) {
        if (reader._closedPromise_reject === void 0) {
          return;
        }
        setPromiseIsHandledToTrue(reader._closedPromise);
        reader._closedPromise_reject(reason);
        reader._closedPromise_resolve = void 0;
        reader._closedPromise_reject = void 0;
      }
      function defaultReaderClosedPromiseResetToRejected(reader, reason) {
        defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
      }
      function defaultReaderClosedPromiseResolve(reader) {
        if (reader._closedPromise_resolve === void 0) {
          return;
        }
        reader._closedPromise_resolve(void 0);
        reader._closedPromise_resolve = void 0;
        reader._closedPromise_reject = void 0;
      }
      const NumberIsFinite = Number.isFinite || function(x2) {
        return typeof x2 === "number" && isFinite(x2);
      };
      const MathTrunc = Math.trunc || function(v) {
        return v < 0 ? Math.ceil(v) : Math.floor(v);
      };
      function isDictionary(x2) {
        return typeof x2 === "object" || typeof x2 === "function";
      }
      function assertDictionary(obj, context) {
        if (obj !== void 0 && !isDictionary(obj)) {
          throw new TypeError(`${context} is not an object.`);
        }
      }
      function assertFunction(x2, context) {
        if (typeof x2 !== "function") {
          throw new TypeError(`${context} is not a function.`);
        }
      }
      function isObject(x2) {
        return typeof x2 === "object" && x2 !== null || typeof x2 === "function";
      }
      function assertObject(x2, context) {
        if (!isObject(x2)) {
          throw new TypeError(`${context} is not an object.`);
        }
      }
      function assertRequiredArgument(x2, position, context) {
        if (x2 === void 0) {
          throw new TypeError(`Parameter ${position} is required in '${context}'.`);
        }
      }
      function assertRequiredField(x2, field, context) {
        if (x2 === void 0) {
          throw new TypeError(`${field} is required in '${context}'.`);
        }
      }
      function convertUnrestrictedDouble(value) {
        return Number(value);
      }
      function censorNegativeZero(x2) {
        return x2 === 0 ? 0 : x2;
      }
      function integerPart(x2) {
        return censorNegativeZero(MathTrunc(x2));
      }
      function convertUnsignedLongLongWithEnforceRange(value, context) {
        const lowerBound = 0;
        const upperBound = Number.MAX_SAFE_INTEGER;
        let x2 = Number(value);
        x2 = censorNegativeZero(x2);
        if (!NumberIsFinite(x2)) {
          throw new TypeError(`${context} is not a finite number`);
        }
        x2 = integerPart(x2);
        if (x2 < lowerBound || x2 > upperBound) {
          throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
        }
        if (!NumberIsFinite(x2) || x2 === 0) {
          return 0;
        }
        return x2;
      }
      function assertReadableStream(x2, context) {
        if (!IsReadableStream(x2)) {
          throw new TypeError(`${context} is not a ReadableStream.`);
        }
      }
      function AcquireReadableStreamDefaultReader(stream) {
        return new ReadableStreamDefaultReader(stream);
      }
      function ReadableStreamAddReadRequest(stream, readRequest) {
        stream._reader._readRequests.push(readRequest);
      }
      function ReadableStreamFulfillReadRequest(stream, chunk, done) {
        const reader = stream._reader;
        const readRequest = reader._readRequests.shift();
        if (done) {
          readRequest._closeSteps();
        } else {
          readRequest._chunkSteps(chunk);
        }
      }
      function ReadableStreamGetNumReadRequests(stream) {
        return stream._reader._readRequests.length;
      }
      function ReadableStreamHasDefaultReader(stream) {
        const reader = stream._reader;
        if (reader === void 0) {
          return false;
        }
        if (!IsReadableStreamDefaultReader(reader)) {
          return false;
        }
        return true;
      }
      class ReadableStreamDefaultReader {
        constructor(stream) {
          assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
          assertReadableStream(stream, "First parameter");
          if (IsReadableStreamLocked(stream)) {
            throw new TypeError("This stream has already been locked for exclusive reading by another reader");
          }
          ReadableStreamReaderGenericInitialize(this, stream);
          this._readRequests = new SimpleQueue();
        }
        /**
         * Returns a promise that will be fulfilled when the stream becomes closed,
         * or rejected if the stream ever errors or the reader's lock is released before the stream finishes closing.
         */
        get closed() {
          if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
          }
          return this._closedPromise;
        }
        /**
         * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
         */
        cancel(reason = void 0) {
          if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
          }
          if (this._ownerReadableStream === void 0) {
            return promiseRejectedWith(readerLockException("cancel"));
          }
          return ReadableStreamReaderGenericCancel(this, reason);
        }
        /**
         * Returns a promise that allows access to the next chunk from the stream's internal queue, if available.
         *
         * If reading a chunk causes the queue to become empty, more data will be pulled from the underlying source.
         */
        read() {
          if (!IsReadableStreamDefaultReader(this)) {
            return promiseRejectedWith(defaultReaderBrandCheckException("read"));
          }
          if (this._ownerReadableStream === void 0) {
            return promiseRejectedWith(readerLockException("read from"));
          }
          let resolvePromise;
          let rejectPromise;
          const promise = newPromise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
          });
          const readRequest = {
            _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
            _closeSteps: () => resolvePromise({ value: void 0, done: true }),
            _errorSteps: (e2) => rejectPromise(e2)
          };
          ReadableStreamDefaultReaderRead(this, readRequest);
          return promise;
        }
        /**
         * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
         * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
         * from now on; otherwise, the reader will appear closed.
         *
         * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
         * the reader's {@link ReadableStreamDefaultReader.read | read()} method has not yet been settled. Attempting to
         * do so will throw a `TypeError` and leave the reader locked to the stream.
         */
        releaseLock() {
          if (!IsReadableStreamDefaultReader(this)) {
            throw defaultReaderBrandCheckException("releaseLock");
          }
          if (this._ownerReadableStream === void 0) {
            return;
          }
          ReadableStreamDefaultReaderRelease(this);
        }
      }
      Object.defineProperties(ReadableStreamDefaultReader.prototype, {
        cancel: { enumerable: true },
        read: { enumerable: true },
        releaseLock: { enumerable: true },
        closed: { enumerable: true }
      });
      setFunctionName(ReadableStreamDefaultReader.prototype.cancel, "cancel");
      setFunctionName(ReadableStreamDefaultReader.prototype.read, "read");
      setFunctionName(ReadableStreamDefaultReader.prototype.releaseLock, "releaseLock");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ReadableStreamDefaultReader.prototype, Symbol.toStringTag, {
          value: "ReadableStreamDefaultReader",
          configurable: true
        });
      }
      function IsReadableStreamDefaultReader(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_readRequests")) {
          return false;
        }
        return x2 instanceof ReadableStreamDefaultReader;
      }
      function ReadableStreamDefaultReaderRead(reader, readRequest) {
        const stream = reader._ownerReadableStream;
        stream._disturbed = true;
        if (stream._state === "closed") {
          readRequest._closeSteps();
        } else if (stream._state === "errored") {
          readRequest._errorSteps(stream._storedError);
        } else {
          stream._readableStreamController[PullSteps](readRequest);
        }
      }
      function ReadableStreamDefaultReaderRelease(reader) {
        ReadableStreamReaderGenericRelease(reader);
        const e2 = new TypeError("Reader was released");
        ReadableStreamDefaultReaderErrorReadRequests(reader, e2);
      }
      function ReadableStreamDefaultReaderErrorReadRequests(reader, e2) {
        const readRequests = reader._readRequests;
        reader._readRequests = new SimpleQueue();
        readRequests.forEach((readRequest) => {
          readRequest._errorSteps(e2);
        });
      }
      function defaultReaderBrandCheckException(name) {
        return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
      }
      const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
      }).prototype);
      class ReadableStreamAsyncIteratorImpl {
        constructor(reader, preventCancel) {
          this._ongoingPromise = void 0;
          this._isFinished = false;
          this._reader = reader;
          this._preventCancel = preventCancel;
        }
        next() {
          const nextSteps = () => this._nextSteps();
          this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
          return this._ongoingPromise;
        }
        return(value) {
          const returnSteps = () => this._returnSteps(value);
          return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
        }
        _nextSteps() {
          if (this._isFinished) {
            return Promise.resolve({ value: void 0, done: true });
          }
          const reader = this._reader;
          let resolvePromise;
          let rejectPromise;
          const promise = newPromise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
          });
          const readRequest = {
            _chunkSteps: (chunk) => {
              this._ongoingPromise = void 0;
              _queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
            },
            _closeSteps: () => {
              this._ongoingPromise = void 0;
              this._isFinished = true;
              ReadableStreamReaderGenericRelease(reader);
              resolvePromise({ value: void 0, done: true });
            },
            _errorSteps: (reason) => {
              this._ongoingPromise = void 0;
              this._isFinished = true;
              ReadableStreamReaderGenericRelease(reader);
              rejectPromise(reason);
            }
          };
          ReadableStreamDefaultReaderRead(reader, readRequest);
          return promise;
        }
        _returnSteps(value) {
          if (this._isFinished) {
            return Promise.resolve({ value, done: true });
          }
          this._isFinished = true;
          const reader = this._reader;
          if (!this._preventCancel) {
            const result = ReadableStreamReaderGenericCancel(reader, value);
            ReadableStreamReaderGenericRelease(reader);
            return transformPromiseWith(result, () => ({ value, done: true }));
          }
          ReadableStreamReaderGenericRelease(reader);
          return promiseResolvedWith({ value, done: true });
        }
      }
      const ReadableStreamAsyncIteratorPrototype = {
        next() {
          if (!IsReadableStreamAsyncIterator(this)) {
            return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
          }
          return this._asyncIteratorImpl.next();
        },
        return(value) {
          if (!IsReadableStreamAsyncIterator(this)) {
            return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
          }
          return this._asyncIteratorImpl.return(value);
        }
      };
      Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
      function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
        const reader = AcquireReadableStreamDefaultReader(stream);
        const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
        const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
        iterator._asyncIteratorImpl = impl;
        return iterator;
      }
      function IsReadableStreamAsyncIterator(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_asyncIteratorImpl")) {
          return false;
        }
        try {
          return x2._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
        } catch (_a2) {
          return false;
        }
      }
      function streamAsyncIteratorBrandCheckException(name) {
        return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
      }
      const NumberIsNaN = Number.isNaN || function(x2) {
        return x2 !== x2;
      };
      var _a, _b, _c;
      function CreateArrayFromList(elements) {
        return elements.slice();
      }
      function CopyDataBlockBytes(dest, destOffset, src, srcOffset, n) {
        new Uint8Array(dest).set(new Uint8Array(src, srcOffset, n), destOffset);
      }
      let TransferArrayBuffer = (O) => {
        if (typeof O.transfer === "function") {
          TransferArrayBuffer = (buffer) => buffer.transfer();
        } else if (typeof structuredClone === "function") {
          TransferArrayBuffer = (buffer) => structuredClone(buffer, { transfer: [buffer] });
        } else {
          TransferArrayBuffer = (buffer) => buffer;
        }
        return TransferArrayBuffer(O);
      };
      let IsDetachedBuffer = (O) => {
        if (typeof O.detached === "boolean") {
          IsDetachedBuffer = (buffer) => buffer.detached;
        } else {
          IsDetachedBuffer = (buffer) => buffer.byteLength === 0;
        }
        return IsDetachedBuffer(O);
      };
      function ArrayBufferSlice(buffer, begin, end) {
        if (buffer.slice) {
          return buffer.slice(begin, end);
        }
        const length = end - begin;
        const slice = new ArrayBuffer(length);
        CopyDataBlockBytes(slice, 0, buffer, begin, length);
        return slice;
      }
      function GetMethod(receiver, prop) {
        const func = receiver[prop];
        if (func === void 0 || func === null) {
          return void 0;
        }
        if (typeof func !== "function") {
          throw new TypeError(`${String(prop)} is not a function`);
        }
        return func;
      }
      function CreateAsyncFromSyncIterator(syncIteratorRecord) {
        const syncIterable = {
          [Symbol.iterator]: () => syncIteratorRecord.iterator
        };
        const asyncIterator = (async function* () {
          return yield* syncIterable;
        })();
        const nextMethod = asyncIterator.next;
        return { iterator: asyncIterator, nextMethod, done: false };
      }
      const SymbolAsyncIterator = (_c = (_a = Symbol.asyncIterator) !== null && _a !== void 0 ? _a : (_b = Symbol.for) === null || _b === void 0 ? void 0 : _b.call(Symbol, "Symbol.asyncIterator")) !== null && _c !== void 0 ? _c : "@@asyncIterator";
      function GetIterator(obj, hint = "sync", method) {
        if (method === void 0) {
          if (hint === "async") {
            method = GetMethod(obj, SymbolAsyncIterator);
            if (method === void 0) {
              const syncMethod = GetMethod(obj, Symbol.iterator);
              const syncIteratorRecord = GetIterator(obj, "sync", syncMethod);
              return CreateAsyncFromSyncIterator(syncIteratorRecord);
            }
          } else {
            method = GetMethod(obj, Symbol.iterator);
          }
        }
        if (method === void 0) {
          throw new TypeError("The object is not iterable");
        }
        const iterator = reflectCall(method, obj, []);
        if (!typeIsObject(iterator)) {
          throw new TypeError("The iterator method must return an object");
        }
        const nextMethod = iterator.next;
        return { iterator, nextMethod, done: false };
      }
      function IteratorNext(iteratorRecord) {
        const result = reflectCall(iteratorRecord.nextMethod, iteratorRecord.iterator, []);
        if (!typeIsObject(result)) {
          throw new TypeError("The iterator.next() method must return an object");
        }
        return result;
      }
      function IteratorComplete(iterResult) {
        return Boolean(iterResult.done);
      }
      function IteratorValue(iterResult) {
        return iterResult.value;
      }
      function IsNonNegativeNumber(v) {
        if (typeof v !== "number") {
          return false;
        }
        if (NumberIsNaN(v)) {
          return false;
        }
        if (v < 0) {
          return false;
        }
        return true;
      }
      function CloneAsUint8Array(O) {
        const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
        return new Uint8Array(buffer);
      }
      function DequeueValue(container) {
        const pair = container._queue.shift();
        container._queueTotalSize -= pair.size;
        if (container._queueTotalSize < 0) {
          container._queueTotalSize = 0;
        }
        return pair.value;
      }
      function EnqueueValueWithSize(container, value, size) {
        if (!IsNonNegativeNumber(size) || size === Infinity) {
          throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
        }
        container._queue.push({ value, size });
        container._queueTotalSize += size;
      }
      function PeekQueueValue(container) {
        const pair = container._queue.peek();
        return pair.value;
      }
      function ResetQueue(container) {
        container._queue = new SimpleQueue();
        container._queueTotalSize = 0;
      }
      function isDataViewConstructor(ctor) {
        return ctor === DataView;
      }
      function isDataView(view) {
        return isDataViewConstructor(view.constructor);
      }
      function arrayBufferViewElementSize(ctor) {
        if (isDataViewConstructor(ctor)) {
          return 1;
        }
        return ctor.BYTES_PER_ELEMENT;
      }
      class ReadableStreamBYOBRequest {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        /**
         * Returns the view for writing in to, or `null` if the BYOB request has already been responded to.
         */
        get view() {
          if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException("view");
          }
          return this._view;
        }
        respond(bytesWritten) {
          if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException("respond");
          }
          assertRequiredArgument(bytesWritten, 1, "respond");
          bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
          if (this._associatedReadableByteStreamController === void 0) {
            throw new TypeError("This BYOB request has been invalidated");
          }
          if (IsDetachedBuffer(this._view.buffer)) {
            throw new TypeError(`The BYOB request's buffer has been detached and so cannot be used as a response`);
          }
          ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
        }
        respondWithNewView(view) {
          if (!IsReadableStreamBYOBRequest(this)) {
            throw byobRequestBrandCheckException("respondWithNewView");
          }
          assertRequiredArgument(view, 1, "respondWithNewView");
          if (!ArrayBuffer.isView(view)) {
            throw new TypeError("You can only respond with array buffer views");
          }
          if (this._associatedReadableByteStreamController === void 0) {
            throw new TypeError("This BYOB request has been invalidated");
          }
          if (IsDetachedBuffer(view.buffer)) {
            throw new TypeError("The given view's buffer has been detached and so cannot be used as a response");
          }
          ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
        }
      }
      Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
        respond: { enumerable: true },
        respondWithNewView: { enumerable: true },
        view: { enumerable: true }
      });
      setFunctionName(ReadableStreamBYOBRequest.prototype.respond, "respond");
      setFunctionName(ReadableStreamBYOBRequest.prototype.respondWithNewView, "respondWithNewView");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ReadableStreamBYOBRequest.prototype, Symbol.toStringTag, {
          value: "ReadableStreamBYOBRequest",
          configurable: true
        });
      }
      class ReadableByteStreamController {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        /**
         * Returns the current BYOB pull request, or `null` if there isn't one.
         */
        get byobRequest() {
          if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException("byobRequest");
          }
          return ReadableByteStreamControllerGetBYOBRequest(this);
        }
        /**
         * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
         * over-full. An underlying byte source ought to use this information to determine when and how to apply backpressure.
         */
        get desiredSize() {
          if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException("desiredSize");
          }
          return ReadableByteStreamControllerGetDesiredSize(this);
        }
        /**
         * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
         * the stream, but once those are read, the stream will become closed.
         */
        close() {
          if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException("close");
          }
          if (this._closeRequested) {
            throw new TypeError("The stream has already been closed; do not close it again!");
          }
          const state = this._controlledReadableByteStream._state;
          if (state !== "readable") {
            throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
          }
          ReadableByteStreamControllerClose(this);
        }
        enqueue(chunk) {
          if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException("enqueue");
          }
          assertRequiredArgument(chunk, 1, "enqueue");
          if (!ArrayBuffer.isView(chunk)) {
            throw new TypeError("chunk must be an array buffer view");
          }
          if (chunk.byteLength === 0) {
            throw new TypeError("chunk must have non-zero byteLength");
          }
          if (chunk.buffer.byteLength === 0) {
            throw new TypeError(`chunk's buffer must have non-zero byteLength`);
          }
          if (this._closeRequested) {
            throw new TypeError("stream is closed or draining");
          }
          const state = this._controlledReadableByteStream._state;
          if (state !== "readable") {
            throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
          }
          ReadableByteStreamControllerEnqueue(this, chunk);
        }
        /**
         * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
         */
        error(e2 = void 0) {
          if (!IsReadableByteStreamController(this)) {
            throw byteStreamControllerBrandCheckException("error");
          }
          ReadableByteStreamControllerError(this, e2);
        }
        /** @internal */
        [CancelSteps](reason) {
          ReadableByteStreamControllerClearPendingPullIntos(this);
          ResetQueue(this);
          const result = this._cancelAlgorithm(reason);
          ReadableByteStreamControllerClearAlgorithms(this);
          return result;
        }
        /** @internal */
        [PullSteps](readRequest) {
          const stream = this._controlledReadableByteStream;
          if (this._queueTotalSize > 0) {
            ReadableByteStreamControllerFillReadRequestFromQueue(this, readRequest);
            return;
          }
          const autoAllocateChunkSize = this._autoAllocateChunkSize;
          if (autoAllocateChunkSize !== void 0) {
            let buffer;
            try {
              buffer = new ArrayBuffer(autoAllocateChunkSize);
            } catch (bufferE) {
              readRequest._errorSteps(bufferE);
              return;
            }
            const pullIntoDescriptor = {
              buffer,
              bufferByteLength: autoAllocateChunkSize,
              byteOffset: 0,
              byteLength: autoAllocateChunkSize,
              bytesFilled: 0,
              minimumFill: 1,
              elementSize: 1,
              viewConstructor: Uint8Array,
              readerType: "default"
            };
            this._pendingPullIntos.push(pullIntoDescriptor);
          }
          ReadableStreamAddReadRequest(stream, readRequest);
          ReadableByteStreamControllerCallPullIfNeeded(this);
        }
        /** @internal */
        [ReleaseSteps]() {
          if (this._pendingPullIntos.length > 0) {
            const firstPullInto = this._pendingPullIntos.peek();
            firstPullInto.readerType = "none";
            this._pendingPullIntos = new SimpleQueue();
            this._pendingPullIntos.push(firstPullInto);
          }
        }
      }
      Object.defineProperties(ReadableByteStreamController.prototype, {
        close: { enumerable: true },
        enqueue: { enumerable: true },
        error: { enumerable: true },
        byobRequest: { enumerable: true },
        desiredSize: { enumerable: true }
      });
      setFunctionName(ReadableByteStreamController.prototype.close, "close");
      setFunctionName(ReadableByteStreamController.prototype.enqueue, "enqueue");
      setFunctionName(ReadableByteStreamController.prototype.error, "error");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ReadableByteStreamController.prototype, Symbol.toStringTag, {
          value: "ReadableByteStreamController",
          configurable: true
        });
      }
      function IsReadableByteStreamController(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_controlledReadableByteStream")) {
          return false;
        }
        return x2 instanceof ReadableByteStreamController;
      }
      function IsReadableStreamBYOBRequest(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_associatedReadableByteStreamController")) {
          return false;
        }
        return x2 instanceof ReadableStreamBYOBRequest;
      }
      function ReadableByteStreamControllerCallPullIfNeeded(controller) {
        const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
        if (!shouldPull) {
          return;
        }
        if (controller._pulling) {
          controller._pullAgain = true;
          return;
        }
        controller._pulling = true;
        const pullPromise = controller._pullAlgorithm();
        uponPromise(pullPromise, () => {
          controller._pulling = false;
          if (controller._pullAgain) {
            controller._pullAgain = false;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }
          return null;
        }, (e2) => {
          ReadableByteStreamControllerError(controller, e2);
          return null;
        });
      }
      function ReadableByteStreamControllerClearPendingPullIntos(controller) {
        ReadableByteStreamControllerInvalidateBYOBRequest(controller);
        controller._pendingPullIntos = new SimpleQueue();
      }
      function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
        let done = false;
        if (stream._state === "closed") {
          done = true;
        }
        const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
        if (pullIntoDescriptor.readerType === "default") {
          ReadableStreamFulfillReadRequest(stream, filledView, done);
        } else {
          ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
        }
      }
      function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
        const bytesFilled = pullIntoDescriptor.bytesFilled;
        const elementSize = pullIntoDescriptor.elementSize;
        return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
      }
      function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
        controller._queue.push({ buffer, byteOffset, byteLength });
        controller._queueTotalSize += byteLength;
      }
      function ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, buffer, byteOffset, byteLength) {
        let clonedChunk;
        try {
          clonedChunk = ArrayBufferSlice(buffer, byteOffset, byteOffset + byteLength);
        } catch (cloneE) {
          ReadableByteStreamControllerError(controller, cloneE);
          throw cloneE;
        }
        ReadableByteStreamControllerEnqueueChunkToQueue(controller, clonedChunk, 0, byteLength);
      }
      function ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, firstDescriptor) {
        if (firstDescriptor.bytesFilled > 0) {
          ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, firstDescriptor.buffer, firstDescriptor.byteOffset, firstDescriptor.bytesFilled);
        }
        ReadableByteStreamControllerShiftPendingPullInto(controller);
      }
      function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
        const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
        const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
        let totalBytesToCopyRemaining = maxBytesToCopy;
        let ready = false;
        const remainderBytes = maxBytesFilled % pullIntoDescriptor.elementSize;
        const maxAlignedBytes = maxBytesFilled - remainderBytes;
        if (maxAlignedBytes >= pullIntoDescriptor.minimumFill) {
          totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
          ready = true;
        }
        const queue = controller._queue;
        while (totalBytesToCopyRemaining > 0) {
          const headOfQueue = queue.peek();
          const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
          const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
          CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
          if (headOfQueue.byteLength === bytesToCopy) {
            queue.shift();
          } else {
            headOfQueue.byteOffset += bytesToCopy;
            headOfQueue.byteLength -= bytesToCopy;
          }
          controller._queueTotalSize -= bytesToCopy;
          ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
          totalBytesToCopyRemaining -= bytesToCopy;
        }
        return ready;
      }
      function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
        pullIntoDescriptor.bytesFilled += size;
      }
      function ReadableByteStreamControllerHandleQueueDrain(controller) {
        if (controller._queueTotalSize === 0 && controller._closeRequested) {
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamClose(controller._controlledReadableByteStream);
        } else {
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
      }
      function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
        if (controller._byobRequest === null) {
          return;
        }
        controller._byobRequest._associatedReadableByteStreamController = void 0;
        controller._byobRequest._view = null;
        controller._byobRequest = null;
      }
      function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
        while (controller._pendingPullIntos.length > 0) {
          if (controller._queueTotalSize === 0) {
            return;
          }
          const pullIntoDescriptor = controller._pendingPullIntos.peek();
          if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
            ReadableByteStreamControllerShiftPendingPullInto(controller);
            ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
          }
        }
      }
      function ReadableByteStreamControllerProcessReadRequestsUsingQueue(controller) {
        const reader = controller._controlledReadableByteStream._reader;
        while (reader._readRequests.length > 0) {
          if (controller._queueTotalSize === 0) {
            return;
          }
          const readRequest = reader._readRequests.shift();
          ReadableByteStreamControllerFillReadRequestFromQueue(controller, readRequest);
        }
      }
      function ReadableByteStreamControllerPullInto(controller, view, min, readIntoRequest) {
        const stream = controller._controlledReadableByteStream;
        const ctor = view.constructor;
        const elementSize = arrayBufferViewElementSize(ctor);
        const { byteOffset, byteLength } = view;
        const minimumFill = min * elementSize;
        let buffer;
        try {
          buffer = TransferArrayBuffer(view.buffer);
        } catch (e2) {
          readIntoRequest._errorSteps(e2);
          return;
        }
        const pullIntoDescriptor = {
          buffer,
          bufferByteLength: buffer.byteLength,
          byteOffset,
          byteLength,
          bytesFilled: 0,
          minimumFill,
          elementSize,
          viewConstructor: ctor,
          readerType: "byob"
        };
        if (controller._pendingPullIntos.length > 0) {
          controller._pendingPullIntos.push(pullIntoDescriptor);
          ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
          return;
        }
        if (stream._state === "closed") {
          const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
          readIntoRequest._closeSteps(emptyView);
          return;
        }
        if (controller._queueTotalSize > 0) {
          if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
            const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
            ReadableByteStreamControllerHandleQueueDrain(controller);
            readIntoRequest._chunkSteps(filledView);
            return;
          }
          if (controller._closeRequested) {
            const e2 = new TypeError("Insufficient bytes to fill elements in the given buffer");
            ReadableByteStreamControllerError(controller, e2);
            readIntoRequest._errorSteps(e2);
            return;
          }
        }
        controller._pendingPullIntos.push(pullIntoDescriptor);
        ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
        ReadableByteStreamControllerCallPullIfNeeded(controller);
      }
      function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
        if (firstDescriptor.readerType === "none") {
          ReadableByteStreamControllerShiftPendingPullInto(controller);
        }
        const stream = controller._controlledReadableByteStream;
        if (ReadableStreamHasBYOBReader(stream)) {
          while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
            ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
          }
        }
      }
      function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
        ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
        if (pullIntoDescriptor.readerType === "none") {
          ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, pullIntoDescriptor);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
          return;
        }
        if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.minimumFill) {
          return;
        }
        ReadableByteStreamControllerShiftPendingPullInto(controller);
        const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
        if (remainderSize > 0) {
          const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
          ReadableByteStreamControllerEnqueueClonedChunkToQueue(controller, pullIntoDescriptor.buffer, end - remainderSize, remainderSize);
        }
        pullIntoDescriptor.bytesFilled -= remainderSize;
        ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
        ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
      }
      function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
        const firstDescriptor = controller._pendingPullIntos.peek();
        ReadableByteStreamControllerInvalidateBYOBRequest(controller);
        const state = controller._controlledReadableByteStream._state;
        if (state === "closed") {
          ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor);
        } else {
          ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
        }
        ReadableByteStreamControllerCallPullIfNeeded(controller);
      }
      function ReadableByteStreamControllerShiftPendingPullInto(controller) {
        const descriptor = controller._pendingPullIntos.shift();
        return descriptor;
      }
      function ReadableByteStreamControllerShouldCallPull(controller) {
        const stream = controller._controlledReadableByteStream;
        if (stream._state !== "readable") {
          return false;
        }
        if (controller._closeRequested) {
          return false;
        }
        if (!controller._started) {
          return false;
        }
        if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
          return true;
        }
        if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
          return true;
        }
        const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
        if (desiredSize > 0) {
          return true;
        }
        return false;
      }
      function ReadableByteStreamControllerClearAlgorithms(controller) {
        controller._pullAlgorithm = void 0;
        controller._cancelAlgorithm = void 0;
      }
      function ReadableByteStreamControllerClose(controller) {
        const stream = controller._controlledReadableByteStream;
        if (controller._closeRequested || stream._state !== "readable") {
          return;
        }
        if (controller._queueTotalSize > 0) {
          controller._closeRequested = true;
          return;
        }
        if (controller._pendingPullIntos.length > 0) {
          const firstPendingPullInto = controller._pendingPullIntos.peek();
          if (firstPendingPullInto.bytesFilled % firstPendingPullInto.elementSize !== 0) {
            const e2 = new TypeError("Insufficient bytes to fill elements in the given buffer");
            ReadableByteStreamControllerError(controller, e2);
            throw e2;
          }
        }
        ReadableByteStreamControllerClearAlgorithms(controller);
        ReadableStreamClose(stream);
      }
      function ReadableByteStreamControllerEnqueue(controller, chunk) {
        const stream = controller._controlledReadableByteStream;
        if (controller._closeRequested || stream._state !== "readable") {
          return;
        }
        const { buffer, byteOffset, byteLength } = chunk;
        if (IsDetachedBuffer(buffer)) {
          throw new TypeError("chunk's buffer is detached and so cannot be enqueued");
        }
        const transferredBuffer = TransferArrayBuffer(buffer);
        if (controller._pendingPullIntos.length > 0) {
          const firstPendingPullInto = controller._pendingPullIntos.peek();
          if (IsDetachedBuffer(firstPendingPullInto.buffer)) {
            throw new TypeError("The BYOB request's buffer has been detached and so cannot be filled with an enqueued chunk");
          }
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
          if (firstPendingPullInto.readerType === "none") {
            ReadableByteStreamControllerEnqueueDetachedPullIntoToQueue(controller, firstPendingPullInto);
          }
        }
        if (ReadableStreamHasDefaultReader(stream)) {
          ReadableByteStreamControllerProcessReadRequestsUsingQueue(controller);
          if (ReadableStreamGetNumReadRequests(stream) === 0) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          } else {
            if (controller._pendingPullIntos.length > 0) {
              ReadableByteStreamControllerShiftPendingPullInto(controller);
            }
            const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
            ReadableStreamFulfillReadRequest(stream, transferredView, false);
          }
        } else if (ReadableStreamHasBYOBReader(stream)) {
          ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        } else {
          ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
        }
        ReadableByteStreamControllerCallPullIfNeeded(controller);
      }
      function ReadableByteStreamControllerError(controller, e2) {
        const stream = controller._controlledReadableByteStream;
        if (stream._state !== "readable") {
          return;
        }
        ReadableByteStreamControllerClearPendingPullIntos(controller);
        ResetQueue(controller);
        ReadableByteStreamControllerClearAlgorithms(controller);
        ReadableStreamError(stream, e2);
      }
      function ReadableByteStreamControllerFillReadRequestFromQueue(controller, readRequest) {
        const entry = controller._queue.shift();
        controller._queueTotalSize -= entry.byteLength;
        ReadableByteStreamControllerHandleQueueDrain(controller);
        const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
        readRequest._chunkSteps(view);
      }
      function ReadableByteStreamControllerGetBYOBRequest(controller) {
        if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
          const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
          SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
          controller._byobRequest = byobRequest;
        }
        return controller._byobRequest;
      }
      function ReadableByteStreamControllerGetDesiredSize(controller) {
        const state = controller._controlledReadableByteStream._state;
        if (state === "errored") {
          return null;
        }
        if (state === "closed") {
          return 0;
        }
        return controller._strategyHWM - controller._queueTotalSize;
      }
      function ReadableByteStreamControllerRespond(controller, bytesWritten) {
        const firstDescriptor = controller._pendingPullIntos.peek();
        const state = controller._controlledReadableByteStream._state;
        if (state === "closed") {
          if (bytesWritten !== 0) {
            throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
          }
        } else {
          if (bytesWritten === 0) {
            throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
          }
          if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
            throw new RangeError("bytesWritten out of range");
          }
        }
        firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
        ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
      }
      function ReadableByteStreamControllerRespondWithNewView(controller, view) {
        const firstDescriptor = controller._pendingPullIntos.peek();
        const state = controller._controlledReadableByteStream._state;
        if (state === "closed") {
          if (view.byteLength !== 0) {
            throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
          }
        } else {
          if (view.byteLength === 0) {
            throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
          }
        }
        if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
          throw new RangeError("The region specified by view does not match byobRequest");
        }
        if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
          throw new RangeError("The buffer of view has different capacity than byobRequest");
        }
        if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
          throw new RangeError("The region specified by view is larger than byobRequest");
        }
        const viewByteLength = view.byteLength;
        firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
        ReadableByteStreamControllerRespondInternal(controller, viewByteLength);
      }
      function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
        controller._controlledReadableByteStream = stream;
        controller._pullAgain = false;
        controller._pulling = false;
        controller._byobRequest = null;
        controller._queue = controller._queueTotalSize = void 0;
        ResetQueue(controller);
        controller._closeRequested = false;
        controller._started = false;
        controller._strategyHWM = highWaterMark;
        controller._pullAlgorithm = pullAlgorithm;
        controller._cancelAlgorithm = cancelAlgorithm;
        controller._autoAllocateChunkSize = autoAllocateChunkSize;
        controller._pendingPullIntos = new SimpleQueue();
        stream._readableStreamController = controller;
        const startResult = startAlgorithm();
        uponPromise(promiseResolvedWith(startResult), () => {
          controller._started = true;
          ReadableByteStreamControllerCallPullIfNeeded(controller);
          return null;
        }, (r2) => {
          ReadableByteStreamControllerError(controller, r2);
          return null;
        });
      }
      function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
        const controller = Object.create(ReadableByteStreamController.prototype);
        let startAlgorithm;
        let pullAlgorithm;
        let cancelAlgorithm;
        if (underlyingByteSource.start !== void 0) {
          startAlgorithm = () => underlyingByteSource.start(controller);
        } else {
          startAlgorithm = () => void 0;
        }
        if (underlyingByteSource.pull !== void 0) {
          pullAlgorithm = () => underlyingByteSource.pull(controller);
        } else {
          pullAlgorithm = () => promiseResolvedWith(void 0);
        }
        if (underlyingByteSource.cancel !== void 0) {
          cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
        } else {
          cancelAlgorithm = () => promiseResolvedWith(void 0);
        }
        const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
        if (autoAllocateChunkSize === 0) {
          throw new TypeError("autoAllocateChunkSize must be greater than 0");
        }
        SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
      }
      function SetUpReadableStreamBYOBRequest(request, controller, view) {
        request._associatedReadableByteStreamController = controller;
        request._view = view;
      }
      function byobRequestBrandCheckException(name) {
        return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
      }
      function byteStreamControllerBrandCheckException(name) {
        return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
      }
      function convertReaderOptions(options, context) {
        assertDictionary(options, context);
        const mode = options === null || options === void 0 ? void 0 : options.mode;
        return {
          mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
        };
      }
      function convertReadableStreamReaderMode(mode, context) {
        mode = `${mode}`;
        if (mode !== "byob") {
          throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
        }
        return mode;
      }
      function convertByobReadOptions(options, context) {
        var _a2;
        assertDictionary(options, context);
        const min = (_a2 = options === null || options === void 0 ? void 0 : options.min) !== null && _a2 !== void 0 ? _a2 : 1;
        return {
          min: convertUnsignedLongLongWithEnforceRange(min, `${context} has member 'min' that`)
        };
      }
      function AcquireReadableStreamBYOBReader(stream) {
        return new ReadableStreamBYOBReader(stream);
      }
      function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
        stream._reader._readIntoRequests.push(readIntoRequest);
      }
      function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
        const reader = stream._reader;
        const readIntoRequest = reader._readIntoRequests.shift();
        if (done) {
          readIntoRequest._closeSteps(chunk);
        } else {
          readIntoRequest._chunkSteps(chunk);
        }
      }
      function ReadableStreamGetNumReadIntoRequests(stream) {
        return stream._reader._readIntoRequests.length;
      }
      function ReadableStreamHasBYOBReader(stream) {
        const reader = stream._reader;
        if (reader === void 0) {
          return false;
        }
        if (!IsReadableStreamBYOBReader(reader)) {
          return false;
        }
        return true;
      }
      class ReadableStreamBYOBReader {
        constructor(stream) {
          assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
          assertReadableStream(stream, "First parameter");
          if (IsReadableStreamLocked(stream)) {
            throw new TypeError("This stream has already been locked for exclusive reading by another reader");
          }
          if (!IsReadableByteStreamController(stream._readableStreamController)) {
            throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
          }
          ReadableStreamReaderGenericInitialize(this, stream);
          this._readIntoRequests = new SimpleQueue();
        }
        /**
         * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
         * the reader's lock is released before the stream finishes closing.
         */
        get closed() {
          if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException("closed"));
          }
          return this._closedPromise;
        }
        /**
         * If the reader is active, behaves the same as {@link ReadableStream.cancel | stream.cancel(reason)}.
         */
        cancel(reason = void 0) {
          if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
          }
          if (this._ownerReadableStream === void 0) {
            return promiseRejectedWith(readerLockException("cancel"));
          }
          return ReadableStreamReaderGenericCancel(this, reason);
        }
        read(view, rawOptions = {}) {
          if (!IsReadableStreamBYOBReader(this)) {
            return promiseRejectedWith(byobReaderBrandCheckException("read"));
          }
          if (!ArrayBuffer.isView(view)) {
            return promiseRejectedWith(new TypeError("view must be an array buffer view"));
          }
          if (view.byteLength === 0) {
            return promiseRejectedWith(new TypeError("view must have non-zero byteLength"));
          }
          if (view.buffer.byteLength === 0) {
            return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
          }
          if (IsDetachedBuffer(view.buffer)) {
            return promiseRejectedWith(new TypeError("view's buffer has been detached"));
          }
          let options;
          try {
            options = convertByobReadOptions(rawOptions, "options");
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
          const min = options.min;
          if (min === 0) {
            return promiseRejectedWith(new TypeError("options.min must be greater than 0"));
          }
          if (!isDataView(view)) {
            if (min > view.length) {
              return promiseRejectedWith(new RangeError("options.min must be less than or equal to view's length"));
            }
          } else if (min > view.byteLength) {
            return promiseRejectedWith(new RangeError("options.min must be less than or equal to view's byteLength"));
          }
          if (this._ownerReadableStream === void 0) {
            return promiseRejectedWith(readerLockException("read from"));
          }
          let resolvePromise;
          let rejectPromise;
          const promise = newPromise((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
          });
          const readIntoRequest = {
            _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
            _closeSteps: (chunk) => resolvePromise({ value: chunk, done: true }),
            _errorSteps: (e2) => rejectPromise(e2)
          };
          ReadableStreamBYOBReaderRead(this, view, min, readIntoRequest);
          return promise;
        }
        /**
         * Releases the reader's lock on the corresponding stream. After the lock is released, the reader is no longer active.
         * If the associated stream is errored when the lock is released, the reader will appear errored in the same way
         * from now on; otherwise, the reader will appear closed.
         *
         * A reader's lock cannot be released while it still has a pending read request, i.e., if a promise returned by
         * the reader's {@link ReadableStreamBYOBReader.read | read()} method has not yet been settled. Attempting to
         * do so will throw a `TypeError` and leave the reader locked to the stream.
         */
        releaseLock() {
          if (!IsReadableStreamBYOBReader(this)) {
            throw byobReaderBrandCheckException("releaseLock");
          }
          if (this._ownerReadableStream === void 0) {
            return;
          }
          ReadableStreamBYOBReaderRelease(this);
        }
      }
      Object.defineProperties(ReadableStreamBYOBReader.prototype, {
        cancel: { enumerable: true },
        read: { enumerable: true },
        releaseLock: { enumerable: true },
        closed: { enumerable: true }
      });
      setFunctionName(ReadableStreamBYOBReader.prototype.cancel, "cancel");
      setFunctionName(ReadableStreamBYOBReader.prototype.read, "read");
      setFunctionName(ReadableStreamBYOBReader.prototype.releaseLock, "releaseLock");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ReadableStreamBYOBReader.prototype, Symbol.toStringTag, {
          value: "ReadableStreamBYOBReader",
          configurable: true
        });
      }
      function IsReadableStreamBYOBReader(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_readIntoRequests")) {
          return false;
        }
        return x2 instanceof ReadableStreamBYOBReader;
      }
      function ReadableStreamBYOBReaderRead(reader, view, min, readIntoRequest) {
        const stream = reader._ownerReadableStream;
        stream._disturbed = true;
        if (stream._state === "errored") {
          readIntoRequest._errorSteps(stream._storedError);
        } else {
          ReadableByteStreamControllerPullInto(stream._readableStreamController, view, min, readIntoRequest);
        }
      }
      function ReadableStreamBYOBReaderRelease(reader) {
        ReadableStreamReaderGenericRelease(reader);
        const e2 = new TypeError("Reader was released");
        ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e2);
      }
      function ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e2) {
        const readIntoRequests = reader._readIntoRequests;
        reader._readIntoRequests = new SimpleQueue();
        readIntoRequests.forEach((readIntoRequest) => {
          readIntoRequest._errorSteps(e2);
        });
      }
      function byobReaderBrandCheckException(name) {
        return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
      }
      function ExtractHighWaterMark(strategy, defaultHWM) {
        const { highWaterMark } = strategy;
        if (highWaterMark === void 0) {
          return defaultHWM;
        }
        if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
          throw new RangeError("Invalid highWaterMark");
        }
        return highWaterMark;
      }
      function ExtractSizeAlgorithm(strategy) {
        const { size } = strategy;
        if (!size) {
          return () => 1;
        }
        return size;
      }
      function convertQueuingStrategy(init, context) {
        assertDictionary(init, context);
        const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
        const size = init === null || init === void 0 ? void 0 : init.size;
        return {
          highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
          size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
        };
      }
      function convertQueuingStrategySize(fn, context) {
        assertFunction(fn, context);
        return (chunk) => convertUnrestrictedDouble(fn(chunk));
      }
      function convertUnderlyingSink(original, context) {
        assertDictionary(original, context);
        const abort = original === null || original === void 0 ? void 0 : original.abort;
        const close = original === null || original === void 0 ? void 0 : original.close;
        const start = original === null || original === void 0 ? void 0 : original.start;
        const type = original === null || original === void 0 ? void 0 : original.type;
        const write = original === null || original === void 0 ? void 0 : original.write;
        return {
          abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
          close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
          start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
          write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
          type
        };
      }
      function convertUnderlyingSinkAbortCallback(fn, original, context) {
        assertFunction(fn, context);
        return (reason) => promiseCall(fn, original, [reason]);
      }
      function convertUnderlyingSinkCloseCallback(fn, original, context) {
        assertFunction(fn, context);
        return () => promiseCall(fn, original, []);
      }
      function convertUnderlyingSinkStartCallback(fn, original, context) {
        assertFunction(fn, context);
        return (controller) => reflectCall(fn, original, [controller]);
      }
      function convertUnderlyingSinkWriteCallback(fn, original, context) {
        assertFunction(fn, context);
        return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
      }
      function assertWritableStream(x2, context) {
        if (!IsWritableStream(x2)) {
          throw new TypeError(`${context} is not a WritableStream.`);
        }
      }
      function isAbortSignal2(value) {
        if (typeof value !== "object" || value === null) {
          return false;
        }
        try {
          return typeof value.aborted === "boolean";
        } catch (_a2) {
          return false;
        }
      }
      const supportsAbortController = typeof AbortController === "function";
      function createAbortController() {
        if (supportsAbortController) {
          return new AbortController();
        }
        return void 0;
      }
      class WritableStream {
        constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
          if (rawUnderlyingSink === void 0) {
            rawUnderlyingSink = null;
          } else {
            assertObject(rawUnderlyingSink, "First parameter");
          }
          const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
          const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
          InitializeWritableStream(this);
          const type = underlyingSink.type;
          if (type !== void 0) {
            throw new RangeError("Invalid type is specified");
          }
          const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
          const highWaterMark = ExtractHighWaterMark(strategy, 1);
          SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
        }
        /**
         * Returns whether or not the writable stream is locked to a writer.
         */
        get locked() {
          if (!IsWritableStream(this)) {
            throw streamBrandCheckException$2("locked");
          }
          return IsWritableStreamLocked(this);
        }
        /**
         * Aborts the stream, signaling that the producer can no longer successfully write to the stream and it is to be
         * immediately moved to an errored state, with any queued-up writes discarded. This will also execute any abort
         * mechanism of the underlying sink.
         *
         * The returned promise will fulfill if the stream shuts down successfully, or reject if the underlying sink signaled
         * that there was an error doing so. Additionally, it will reject with a `TypeError` (without attempting to cancel
         * the stream) if the stream is currently locked.
         */
        abort(reason = void 0) {
          if (!IsWritableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$2("abort"));
          }
          if (IsWritableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError("Cannot abort a stream that already has a writer"));
          }
          return WritableStreamAbort(this, reason);
        }
        /**
         * Closes the stream. The underlying sink will finish processing any previously-written chunks, before invoking its
         * close behavior. During this time any further attempts to write will fail (without erroring the stream).
         *
         * The method returns a promise that will fulfill if all remaining chunks are successfully written and the stream
         * successfully closes, or rejects if an error is encountered during this process. Additionally, it will reject with
         * a `TypeError` (without attempting to cancel the stream) if the stream is currently locked.
         */
        close() {
          if (!IsWritableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$2("close"));
          }
          if (IsWritableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError("Cannot close a stream that already has a writer"));
          }
          if (WritableStreamCloseQueuedOrInFlight(this)) {
            return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
          }
          return WritableStreamClose(this);
        }
        /**
         * Creates a {@link WritableStreamDefaultWriter | writer} and locks the stream to the new writer. While the stream
         * is locked, no other writer can be acquired until this one is released.
         *
         * This functionality is especially useful for creating abstractions that desire the ability to write to a stream
         * without interruption or interleaving. By getting a writer for the stream, you can ensure nobody else can write at
         * the same time, which would cause the resulting written data to be unpredictable and probably useless.
         */
        getWriter() {
          if (!IsWritableStream(this)) {
            throw streamBrandCheckException$2("getWriter");
          }
          return AcquireWritableStreamDefaultWriter(this);
        }
      }
      Object.defineProperties(WritableStream.prototype, {
        abort: { enumerable: true },
        close: { enumerable: true },
        getWriter: { enumerable: true },
        locked: { enumerable: true }
      });
      setFunctionName(WritableStream.prototype.abort, "abort");
      setFunctionName(WritableStream.prototype.close, "close");
      setFunctionName(WritableStream.prototype.getWriter, "getWriter");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(WritableStream.prototype, Symbol.toStringTag, {
          value: "WritableStream",
          configurable: true
        });
      }
      function AcquireWritableStreamDefaultWriter(stream) {
        return new WritableStreamDefaultWriter(stream);
      }
      function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
        const stream = Object.create(WritableStream.prototype);
        InitializeWritableStream(stream);
        const controller = Object.create(WritableStreamDefaultController.prototype);
        SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
        return stream;
      }
      function InitializeWritableStream(stream) {
        stream._state = "writable";
        stream._storedError = void 0;
        stream._writer = void 0;
        stream._writableStreamController = void 0;
        stream._writeRequests = new SimpleQueue();
        stream._inFlightWriteRequest = void 0;
        stream._closeRequest = void 0;
        stream._inFlightCloseRequest = void 0;
        stream._pendingAbortRequest = void 0;
        stream._backpressure = false;
      }
      function IsWritableStream(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_writableStreamController")) {
          return false;
        }
        return x2 instanceof WritableStream;
      }
      function IsWritableStreamLocked(stream) {
        if (stream._writer === void 0) {
          return false;
        }
        return true;
      }
      function WritableStreamAbort(stream, reason) {
        var _a2;
        if (stream._state === "closed" || stream._state === "errored") {
          return promiseResolvedWith(void 0);
        }
        stream._writableStreamController._abortReason = reason;
        (_a2 = stream._writableStreamController._abortController) === null || _a2 === void 0 ? void 0 : _a2.abort(reason);
        const state = stream._state;
        if (state === "closed" || state === "errored") {
          return promiseResolvedWith(void 0);
        }
        if (stream._pendingAbortRequest !== void 0) {
          return stream._pendingAbortRequest._promise;
        }
        let wasAlreadyErroring = false;
        if (state === "erroring") {
          wasAlreadyErroring = true;
          reason = void 0;
        }
        const promise = newPromise((resolve, reject) => {
          stream._pendingAbortRequest = {
            _promise: void 0,
            _resolve: resolve,
            _reject: reject,
            _reason: reason,
            _wasAlreadyErroring: wasAlreadyErroring
          };
        });
        stream._pendingAbortRequest._promise = promise;
        if (!wasAlreadyErroring) {
          WritableStreamStartErroring(stream, reason);
        }
        return promise;
      }
      function WritableStreamClose(stream) {
        const state = stream._state;
        if (state === "closed" || state === "errored") {
          return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
        }
        const promise = newPromise((resolve, reject) => {
          const closeRequest = {
            _resolve: resolve,
            _reject: reject
          };
          stream._closeRequest = closeRequest;
        });
        const writer = stream._writer;
        if (writer !== void 0 && stream._backpressure && state === "writable") {
          defaultWriterReadyPromiseResolve(writer);
        }
        WritableStreamDefaultControllerClose(stream._writableStreamController);
        return promise;
      }
      function WritableStreamAddWriteRequest(stream) {
        const promise = newPromise((resolve, reject) => {
          const writeRequest = {
            _resolve: resolve,
            _reject: reject
          };
          stream._writeRequests.push(writeRequest);
        });
        return promise;
      }
      function WritableStreamDealWithRejection(stream, error) {
        const state = stream._state;
        if (state === "writable") {
          WritableStreamStartErroring(stream, error);
          return;
        }
        WritableStreamFinishErroring(stream);
      }
      function WritableStreamStartErroring(stream, reason) {
        const controller = stream._writableStreamController;
        stream._state = "erroring";
        stream._storedError = reason;
        const writer = stream._writer;
        if (writer !== void 0) {
          WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
        }
        if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
          WritableStreamFinishErroring(stream);
        }
      }
      function WritableStreamFinishErroring(stream) {
        stream._state = "errored";
        stream._writableStreamController[ErrorSteps]();
        const storedError = stream._storedError;
        stream._writeRequests.forEach((writeRequest) => {
          writeRequest._reject(storedError);
        });
        stream._writeRequests = new SimpleQueue();
        if (stream._pendingAbortRequest === void 0) {
          WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          return;
        }
        const abortRequest = stream._pendingAbortRequest;
        stream._pendingAbortRequest = void 0;
        if (abortRequest._wasAlreadyErroring) {
          abortRequest._reject(storedError);
          WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          return;
        }
        const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
        uponPromise(promise, () => {
          abortRequest._resolve();
          WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          return null;
        }, (reason) => {
          abortRequest._reject(reason);
          WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          return null;
        });
      }
      function WritableStreamFinishInFlightWrite(stream) {
        stream._inFlightWriteRequest._resolve(void 0);
        stream._inFlightWriteRequest = void 0;
      }
      function WritableStreamFinishInFlightWriteWithError(stream, error) {
        stream._inFlightWriteRequest._reject(error);
        stream._inFlightWriteRequest = void 0;
        WritableStreamDealWithRejection(stream, error);
      }
      function WritableStreamFinishInFlightClose(stream) {
        stream._inFlightCloseRequest._resolve(void 0);
        stream._inFlightCloseRequest = void 0;
        const state = stream._state;
        if (state === "erroring") {
          stream._storedError = void 0;
          if (stream._pendingAbortRequest !== void 0) {
            stream._pendingAbortRequest._resolve();
            stream._pendingAbortRequest = void 0;
          }
        }
        stream._state = "closed";
        const writer = stream._writer;
        if (writer !== void 0) {
          defaultWriterClosedPromiseResolve(writer);
        }
      }
      function WritableStreamFinishInFlightCloseWithError(stream, error) {
        stream._inFlightCloseRequest._reject(error);
        stream._inFlightCloseRequest = void 0;
        if (stream._pendingAbortRequest !== void 0) {
          stream._pendingAbortRequest._reject(error);
          stream._pendingAbortRequest = void 0;
        }
        WritableStreamDealWithRejection(stream, error);
      }
      function WritableStreamCloseQueuedOrInFlight(stream) {
        if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) {
          return false;
        }
        return true;
      }
      function WritableStreamHasOperationMarkedInFlight(stream) {
        if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) {
          return false;
        }
        return true;
      }
      function WritableStreamMarkCloseRequestInFlight(stream) {
        stream._inFlightCloseRequest = stream._closeRequest;
        stream._closeRequest = void 0;
      }
      function WritableStreamMarkFirstWriteRequestInFlight(stream) {
        stream._inFlightWriteRequest = stream._writeRequests.shift();
      }
      function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
        if (stream._closeRequest !== void 0) {
          stream._closeRequest._reject(stream._storedError);
          stream._closeRequest = void 0;
        }
        const writer = stream._writer;
        if (writer !== void 0) {
          defaultWriterClosedPromiseReject(writer, stream._storedError);
        }
      }
      function WritableStreamUpdateBackpressure(stream, backpressure) {
        const writer = stream._writer;
        if (writer !== void 0 && backpressure !== stream._backpressure) {
          if (backpressure) {
            defaultWriterReadyPromiseReset(writer);
          } else {
            defaultWriterReadyPromiseResolve(writer);
          }
        }
        stream._backpressure = backpressure;
      }
      class WritableStreamDefaultWriter {
        constructor(stream) {
          assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
          assertWritableStream(stream, "First parameter");
          if (IsWritableStreamLocked(stream)) {
            throw new TypeError("This stream has already been locked for exclusive writing by another writer");
          }
          this._ownerWritableStream = stream;
          stream._writer = this;
          const state = stream._state;
          if (state === "writable") {
            if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
              defaultWriterReadyPromiseInitialize(this);
            } else {
              defaultWriterReadyPromiseInitializeAsResolved(this);
            }
            defaultWriterClosedPromiseInitialize(this);
          } else if (state === "erroring") {
            defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
            defaultWriterClosedPromiseInitialize(this);
          } else if (state === "closed") {
            defaultWriterReadyPromiseInitializeAsResolved(this);
            defaultWriterClosedPromiseInitializeAsResolved(this);
          } else {
            const storedError = stream._storedError;
            defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
            defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
          }
        }
        /**
         * Returns a promise that will be fulfilled when the stream becomes closed, or rejected if the stream ever errors or
         * the writer’s lock is released before the stream finishes closing.
         */
        get closed() {
          if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
          }
          return this._closedPromise;
        }
        /**
         * Returns the desired size to fill the stream’s internal queue. It can be negative, if the queue is over-full.
         * A producer can use this information to determine the right amount of data to write.
         *
         * It will be `null` if the stream cannot be successfully written to (due to either being errored, or having an abort
         * queued up). It will return zero if the stream is closed. And the getter will throw an exception if invoked when
         * the writer’s lock is released.
         */
        get desiredSize() {
          if (!IsWritableStreamDefaultWriter(this)) {
            throw defaultWriterBrandCheckException("desiredSize");
          }
          if (this._ownerWritableStream === void 0) {
            throw defaultWriterLockException("desiredSize");
          }
          return WritableStreamDefaultWriterGetDesiredSize(this);
        }
        /**
         * Returns a promise that will be fulfilled when the desired size to fill the stream’s internal queue transitions
         * from non-positive to positive, signaling that it is no longer applying backpressure. Once the desired size dips
         * back to zero or below, the getter will return a new promise that stays pending until the next transition.
         *
         * If the stream becomes errored or aborted, or the writer’s lock is released, the returned promise will become
         * rejected.
         */
        get ready() {
          if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
          }
          return this._readyPromise;
        }
        /**
         * If the reader is active, behaves the same as {@link WritableStream.abort | stream.abort(reason)}.
         */
        abort(reason = void 0) {
          if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
          }
          if (this._ownerWritableStream === void 0) {
            return promiseRejectedWith(defaultWriterLockException("abort"));
          }
          return WritableStreamDefaultWriterAbort(this, reason);
        }
        /**
         * If the reader is active, behaves the same as {@link WritableStream.close | stream.close()}.
         */
        close() {
          if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException("close"));
          }
          const stream = this._ownerWritableStream;
          if (stream === void 0) {
            return promiseRejectedWith(defaultWriterLockException("close"));
          }
          if (WritableStreamCloseQueuedOrInFlight(stream)) {
            return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
          }
          return WritableStreamDefaultWriterClose(this);
        }
        /**
         * Releases the writer’s lock on the corresponding stream. After the lock is released, the writer is no longer active.
         * If the associated stream is errored when the lock is released, the writer will appear errored in the same way from
         * now on; otherwise, the writer will appear closed.
         *
         * Note that the lock can still be released even if some ongoing writes have not yet finished (i.e. even if the
         * promises returned from previous calls to {@link WritableStreamDefaultWriter.write | write()} have not yet settled).
         * It’s not necessary to hold the lock on the writer for the duration of the write; the lock instead simply prevents
         * other producers from writing in an interleaved manner.
         */
        releaseLock() {
          if (!IsWritableStreamDefaultWriter(this)) {
            throw defaultWriterBrandCheckException("releaseLock");
          }
          const stream = this._ownerWritableStream;
          if (stream === void 0) {
            return;
          }
          WritableStreamDefaultWriterRelease(this);
        }
        write(chunk = void 0) {
          if (!IsWritableStreamDefaultWriter(this)) {
            return promiseRejectedWith(defaultWriterBrandCheckException("write"));
          }
          if (this._ownerWritableStream === void 0) {
            return promiseRejectedWith(defaultWriterLockException("write to"));
          }
          return WritableStreamDefaultWriterWrite(this, chunk);
        }
      }
      Object.defineProperties(WritableStreamDefaultWriter.prototype, {
        abort: { enumerable: true },
        close: { enumerable: true },
        releaseLock: { enumerable: true },
        write: { enumerable: true },
        closed: { enumerable: true },
        desiredSize: { enumerable: true },
        ready: { enumerable: true }
      });
      setFunctionName(WritableStreamDefaultWriter.prototype.abort, "abort");
      setFunctionName(WritableStreamDefaultWriter.prototype.close, "close");
      setFunctionName(WritableStreamDefaultWriter.prototype.releaseLock, "releaseLock");
      setFunctionName(WritableStreamDefaultWriter.prototype.write, "write");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(WritableStreamDefaultWriter.prototype, Symbol.toStringTag, {
          value: "WritableStreamDefaultWriter",
          configurable: true
        });
      }
      function IsWritableStreamDefaultWriter(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_ownerWritableStream")) {
          return false;
        }
        return x2 instanceof WritableStreamDefaultWriter;
      }
      function WritableStreamDefaultWriterAbort(writer, reason) {
        const stream = writer._ownerWritableStream;
        return WritableStreamAbort(stream, reason);
      }
      function WritableStreamDefaultWriterClose(writer) {
        const stream = writer._ownerWritableStream;
        return WritableStreamClose(stream);
      }
      function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
        const stream = writer._ownerWritableStream;
        const state = stream._state;
        if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
          return promiseResolvedWith(void 0);
        }
        if (state === "errored") {
          return promiseRejectedWith(stream._storedError);
        }
        return WritableStreamDefaultWriterClose(writer);
      }
      function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error) {
        if (writer._closedPromiseState === "pending") {
          defaultWriterClosedPromiseReject(writer, error);
        } else {
          defaultWriterClosedPromiseResetToRejected(writer, error);
        }
      }
      function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error) {
        if (writer._readyPromiseState === "pending") {
          defaultWriterReadyPromiseReject(writer, error);
        } else {
          defaultWriterReadyPromiseResetToRejected(writer, error);
        }
      }
      function WritableStreamDefaultWriterGetDesiredSize(writer) {
        const stream = writer._ownerWritableStream;
        const state = stream._state;
        if (state === "errored" || state === "erroring") {
          return null;
        }
        if (state === "closed") {
          return 0;
        }
        return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
      }
      function WritableStreamDefaultWriterRelease(writer) {
        const stream = writer._ownerWritableStream;
        const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
        WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
        WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
        stream._writer = void 0;
        writer._ownerWritableStream = void 0;
      }
      function WritableStreamDefaultWriterWrite(writer, chunk) {
        const stream = writer._ownerWritableStream;
        const controller = stream._writableStreamController;
        const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
        if (stream !== writer._ownerWritableStream) {
          return promiseRejectedWith(defaultWriterLockException("write to"));
        }
        const state = stream._state;
        if (state === "errored") {
          return promiseRejectedWith(stream._storedError);
        }
        if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
          return promiseRejectedWith(new TypeError("The stream is closing or closed and cannot be written to"));
        }
        if (state === "erroring") {
          return promiseRejectedWith(stream._storedError);
        }
        const promise = WritableStreamAddWriteRequest(stream);
        WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
        return promise;
      }
      const closeSentinel = {};
      class WritableStreamDefaultController {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        /**
         * The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.
         *
         * @deprecated
         *  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.
         *  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.
         */
        get abortReason() {
          if (!IsWritableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$2("abortReason");
          }
          return this._abortReason;
        }
        /**
         * An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.
         */
        get signal() {
          if (!IsWritableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$2("signal");
          }
          if (this._abortController === void 0) {
            throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
          }
          return this._abortController.signal;
        }
        /**
         * Closes the controlled writable stream, making all future interactions with it fail with the given error `e`.
         *
         * This method is rarely used, since usually it suffices to return a rejected promise from one of the underlying
         * sink's methods. However, it can be useful for suddenly shutting down a stream in response to an event outside the
         * normal lifecycle of interactions with the underlying sink.
         */
        error(e2 = void 0) {
          if (!IsWritableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$2("error");
          }
          const state = this._controlledWritableStream._state;
          if (state !== "writable") {
            return;
          }
          WritableStreamDefaultControllerError(this, e2);
        }
        /** @internal */
        [AbortSteps](reason) {
          const result = this._abortAlgorithm(reason);
          WritableStreamDefaultControllerClearAlgorithms(this);
          return result;
        }
        /** @internal */
        [ErrorSteps]() {
          ResetQueue(this);
        }
      }
      Object.defineProperties(WritableStreamDefaultController.prototype, {
        abortReason: { enumerable: true },
        signal: { enumerable: true },
        error: { enumerable: true }
      });
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(WritableStreamDefaultController.prototype, Symbol.toStringTag, {
          value: "WritableStreamDefaultController",
          configurable: true
        });
      }
      function IsWritableStreamDefaultController(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_controlledWritableStream")) {
          return false;
        }
        return x2 instanceof WritableStreamDefaultController;
      }
      function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
        controller._controlledWritableStream = stream;
        stream._writableStreamController = controller;
        controller._queue = void 0;
        controller._queueTotalSize = void 0;
        ResetQueue(controller);
        controller._abortReason = void 0;
        controller._abortController = createAbortController();
        controller._started = false;
        controller._strategySizeAlgorithm = sizeAlgorithm;
        controller._strategyHWM = highWaterMark;
        controller._writeAlgorithm = writeAlgorithm;
        controller._closeAlgorithm = closeAlgorithm;
        controller._abortAlgorithm = abortAlgorithm;
        const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
        WritableStreamUpdateBackpressure(stream, backpressure);
        const startResult = startAlgorithm();
        const startPromise = promiseResolvedWith(startResult);
        uponPromise(startPromise, () => {
          controller._started = true;
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          return null;
        }, (r2) => {
          controller._started = true;
          WritableStreamDealWithRejection(stream, r2);
          return null;
        });
      }
      function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
        const controller = Object.create(WritableStreamDefaultController.prototype);
        let startAlgorithm;
        let writeAlgorithm;
        let closeAlgorithm;
        let abortAlgorithm;
        if (underlyingSink.start !== void 0) {
          startAlgorithm = () => underlyingSink.start(controller);
        } else {
          startAlgorithm = () => void 0;
        }
        if (underlyingSink.write !== void 0) {
          writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
        } else {
          writeAlgorithm = () => promiseResolvedWith(void 0);
        }
        if (underlyingSink.close !== void 0) {
          closeAlgorithm = () => underlyingSink.close();
        } else {
          closeAlgorithm = () => promiseResolvedWith(void 0);
        }
        if (underlyingSink.abort !== void 0) {
          abortAlgorithm = (reason) => underlyingSink.abort(reason);
        } else {
          abortAlgorithm = () => promiseResolvedWith(void 0);
        }
        SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
      }
      function WritableStreamDefaultControllerClearAlgorithms(controller) {
        controller._writeAlgorithm = void 0;
        controller._closeAlgorithm = void 0;
        controller._abortAlgorithm = void 0;
        controller._strategySizeAlgorithm = void 0;
      }
      function WritableStreamDefaultControllerClose(controller) {
        EnqueueValueWithSize(controller, closeSentinel, 0);
        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
      }
      function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
        try {
          return controller._strategySizeAlgorithm(chunk);
        } catch (chunkSizeE) {
          WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
          return 1;
        }
      }
      function WritableStreamDefaultControllerGetDesiredSize(controller) {
        return controller._strategyHWM - controller._queueTotalSize;
      }
      function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
        try {
          EnqueueValueWithSize(controller, chunk, chunkSize);
        } catch (enqueueE) {
          WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
          return;
        }
        const stream = controller._controlledWritableStream;
        if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") {
          const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
          WritableStreamUpdateBackpressure(stream, backpressure);
        }
        WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
      }
      function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
        const stream = controller._controlledWritableStream;
        if (!controller._started) {
          return;
        }
        if (stream._inFlightWriteRequest !== void 0) {
          return;
        }
        const state = stream._state;
        if (state === "erroring") {
          WritableStreamFinishErroring(stream);
          return;
        }
        if (controller._queue.length === 0) {
          return;
        }
        const value = PeekQueueValue(controller);
        if (value === closeSentinel) {
          WritableStreamDefaultControllerProcessClose(controller);
        } else {
          WritableStreamDefaultControllerProcessWrite(controller, value);
        }
      }
      function WritableStreamDefaultControllerErrorIfNeeded(controller, error) {
        if (controller._controlledWritableStream._state === "writable") {
          WritableStreamDefaultControllerError(controller, error);
        }
      }
      function WritableStreamDefaultControllerProcessClose(controller) {
        const stream = controller._controlledWritableStream;
        WritableStreamMarkCloseRequestInFlight(stream);
        DequeueValue(controller);
        const sinkClosePromise = controller._closeAlgorithm();
        WritableStreamDefaultControllerClearAlgorithms(controller);
        uponPromise(sinkClosePromise, () => {
          WritableStreamFinishInFlightClose(stream);
          return null;
        }, (reason) => {
          WritableStreamFinishInFlightCloseWithError(stream, reason);
          return null;
        });
      }
      function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
        const stream = controller._controlledWritableStream;
        WritableStreamMarkFirstWriteRequestInFlight(stream);
        const sinkWritePromise = controller._writeAlgorithm(chunk);
        uponPromise(sinkWritePromise, () => {
          WritableStreamFinishInFlightWrite(stream);
          const state = stream._state;
          DequeueValue(controller);
          if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
          }
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          return null;
        }, (reason) => {
          if (stream._state === "writable") {
            WritableStreamDefaultControllerClearAlgorithms(controller);
          }
          WritableStreamFinishInFlightWriteWithError(stream, reason);
          return null;
        });
      }
      function WritableStreamDefaultControllerGetBackpressure(controller) {
        const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
        return desiredSize <= 0;
      }
      function WritableStreamDefaultControllerError(controller, error) {
        const stream = controller._controlledWritableStream;
        WritableStreamDefaultControllerClearAlgorithms(controller);
        WritableStreamStartErroring(stream, error);
      }
      function streamBrandCheckException$2(name) {
        return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
      }
      function defaultControllerBrandCheckException$2(name) {
        return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
      }
      function defaultWriterBrandCheckException(name) {
        return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
      }
      function defaultWriterLockException(name) {
        return new TypeError("Cannot " + name + " a stream using a released writer");
      }
      function defaultWriterClosedPromiseInitialize(writer) {
        writer._closedPromise = newPromise((resolve, reject) => {
          writer._closedPromise_resolve = resolve;
          writer._closedPromise_reject = reject;
          writer._closedPromiseState = "pending";
        });
      }
      function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
        defaultWriterClosedPromiseInitialize(writer);
        defaultWriterClosedPromiseReject(writer, reason);
      }
      function defaultWriterClosedPromiseInitializeAsResolved(writer) {
        defaultWriterClosedPromiseInitialize(writer);
        defaultWriterClosedPromiseResolve(writer);
      }
      function defaultWriterClosedPromiseReject(writer, reason) {
        if (writer._closedPromise_reject === void 0) {
          return;
        }
        setPromiseIsHandledToTrue(writer._closedPromise);
        writer._closedPromise_reject(reason);
        writer._closedPromise_resolve = void 0;
        writer._closedPromise_reject = void 0;
        writer._closedPromiseState = "rejected";
      }
      function defaultWriterClosedPromiseResetToRejected(writer, reason) {
        defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
      }
      function defaultWriterClosedPromiseResolve(writer) {
        if (writer._closedPromise_resolve === void 0) {
          return;
        }
        writer._closedPromise_resolve(void 0);
        writer._closedPromise_resolve = void 0;
        writer._closedPromise_reject = void 0;
        writer._closedPromiseState = "resolved";
      }
      function defaultWriterReadyPromiseInitialize(writer) {
        writer._readyPromise = newPromise((resolve, reject) => {
          writer._readyPromise_resolve = resolve;
          writer._readyPromise_reject = reject;
        });
        writer._readyPromiseState = "pending";
      }
      function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
        defaultWriterReadyPromiseInitialize(writer);
        defaultWriterReadyPromiseReject(writer, reason);
      }
      function defaultWriterReadyPromiseInitializeAsResolved(writer) {
        defaultWriterReadyPromiseInitialize(writer);
        defaultWriterReadyPromiseResolve(writer);
      }
      function defaultWriterReadyPromiseReject(writer, reason) {
        if (writer._readyPromise_reject === void 0) {
          return;
        }
        setPromiseIsHandledToTrue(writer._readyPromise);
        writer._readyPromise_reject(reason);
        writer._readyPromise_resolve = void 0;
        writer._readyPromise_reject = void 0;
        writer._readyPromiseState = "rejected";
      }
      function defaultWriterReadyPromiseReset(writer) {
        defaultWriterReadyPromiseInitialize(writer);
      }
      function defaultWriterReadyPromiseResetToRejected(writer, reason) {
        defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
      }
      function defaultWriterReadyPromiseResolve(writer) {
        if (writer._readyPromise_resolve === void 0) {
          return;
        }
        writer._readyPromise_resolve(void 0);
        writer._readyPromise_resolve = void 0;
        writer._readyPromise_reject = void 0;
        writer._readyPromiseState = "fulfilled";
      }
      function getGlobals() {
        if (typeof globalThis !== "undefined") {
          return globalThis;
        } else if (typeof self !== "undefined") {
          return self;
        } else if (typeof global !== "undefined") {
          return global;
        }
        return void 0;
      }
      const globals = getGlobals();
      function isDOMExceptionConstructor(ctor) {
        if (!(typeof ctor === "function" || typeof ctor === "object")) {
          return false;
        }
        if (ctor.name !== "DOMException") {
          return false;
        }
        try {
          new ctor();
          return true;
        } catch (_a2) {
          return false;
        }
      }
      function getFromGlobal() {
        const ctor = globals === null || globals === void 0 ? void 0 : globals.DOMException;
        return isDOMExceptionConstructor(ctor) ? ctor : void 0;
      }
      function createPolyfill() {
        const ctor = function DOMException3(message, name) {
          this.message = message || "";
          this.name = name || "Error";
          if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
          }
        };
        setFunctionName(ctor, "DOMException");
        ctor.prototype = Object.create(Error.prototype);
        Object.defineProperty(ctor.prototype, "constructor", { value: ctor, writable: true, configurable: true });
        return ctor;
      }
      const DOMException2 = getFromGlobal() || createPolyfill();
      function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
        const reader = AcquireReadableStreamDefaultReader(source);
        const writer = AcquireWritableStreamDefaultWriter(dest);
        source._disturbed = true;
        let shuttingDown = false;
        let currentWrite = promiseResolvedWith(void 0);
        return newPromise((resolve, reject) => {
          let abortAlgorithm;
          if (signal !== void 0) {
            abortAlgorithm = () => {
              const error = signal.reason !== void 0 ? signal.reason : new DOMException2("Aborted", "AbortError");
              const actions = [];
              if (!preventAbort) {
                actions.push(() => {
                  if (dest._state === "writable") {
                    return WritableStreamAbort(dest, error);
                  }
                  return promiseResolvedWith(void 0);
                });
              }
              if (!preventCancel) {
                actions.push(() => {
                  if (source._state === "readable") {
                    return ReadableStreamCancel(source, error);
                  }
                  return promiseResolvedWith(void 0);
                });
              }
              shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error);
            };
            if (signal.aborted) {
              abortAlgorithm();
              return;
            }
            signal.addEventListener("abort", abortAlgorithm);
          }
          function pipeLoop() {
            return newPromise((resolveLoop, rejectLoop) => {
              function next(done) {
                if (done) {
                  resolveLoop();
                } else {
                  PerformPromiseThen(pipeStep(), next, rejectLoop);
                }
              }
              next(false);
            });
          }
          function pipeStep() {
            if (shuttingDown) {
              return promiseResolvedWith(true);
            }
            return PerformPromiseThen(writer._readyPromise, () => {
              return newPromise((resolveRead, rejectRead) => {
                ReadableStreamDefaultReaderRead(reader, {
                  _chunkSteps: (chunk) => {
                    currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop2);
                    resolveRead(false);
                  },
                  _closeSteps: () => resolveRead(true),
                  _errorSteps: rejectRead
                });
              });
            });
          }
          isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
            if (!preventAbort) {
              shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
            } else {
              shutdown(true, storedError);
            }
            return null;
          });
          isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
            if (!preventCancel) {
              shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
            } else {
              shutdown(true, storedError);
            }
            return null;
          });
          isOrBecomesClosed(source, reader._closedPromise, () => {
            if (!preventClose) {
              shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
            } else {
              shutdown();
            }
            return null;
          });
          if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
            const destClosed = new TypeError("the destination writable stream closed before all data could be piped to it");
            if (!preventCancel) {
              shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
            } else {
              shutdown(true, destClosed);
            }
          }
          setPromiseIsHandledToTrue(pipeLoop());
          function waitForWritesToFinish() {
            const oldCurrentWrite = currentWrite;
            return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
          }
          function isOrBecomesErrored(stream, promise, action) {
            if (stream._state === "errored") {
              action(stream._storedError);
            } else {
              uponRejection(promise, action);
            }
          }
          function isOrBecomesClosed(stream, promise, action) {
            if (stream._state === "closed") {
              action();
            } else {
              uponFulfillment(promise, action);
            }
          }
          function shutdownWithAction(action, originalIsError, originalError) {
            if (shuttingDown) {
              return;
            }
            shuttingDown = true;
            if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
              uponFulfillment(waitForWritesToFinish(), doTheRest);
            } else {
              doTheRest();
            }
            function doTheRest() {
              uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
              return null;
            }
          }
          function shutdown(isError, error) {
            if (shuttingDown) {
              return;
            }
            shuttingDown = true;
            if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
              uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error));
            } else {
              finalize(isError, error);
            }
          }
          function finalize(isError, error) {
            WritableStreamDefaultWriterRelease(writer);
            ReadableStreamReaderGenericRelease(reader);
            if (signal !== void 0) {
              signal.removeEventListener("abort", abortAlgorithm);
            }
            if (isError) {
              reject(error);
            } else {
              resolve(void 0);
            }
            return null;
          }
        });
      }
      class ReadableStreamDefaultController {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        /**
         * Returns the desired size to fill the controlled stream's internal queue. It can be negative, if the queue is
         * over-full. An underlying source ought to use this information to determine when and how to apply backpressure.
         */
        get desiredSize() {
          if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1("desiredSize");
          }
          return ReadableStreamDefaultControllerGetDesiredSize(this);
        }
        /**
         * Closes the controlled readable stream. Consumers will still be able to read any previously-enqueued chunks from
         * the stream, but once those are read, the stream will become closed.
         */
        close() {
          if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1("close");
          }
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
            throw new TypeError("The stream is not in a state that permits close");
          }
          ReadableStreamDefaultControllerClose(this);
        }
        enqueue(chunk = void 0) {
          if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1("enqueue");
          }
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
            throw new TypeError("The stream is not in a state that permits enqueue");
          }
          return ReadableStreamDefaultControllerEnqueue(this, chunk);
        }
        /**
         * Errors the controlled readable stream, making all future interactions with it fail with the given error `e`.
         */
        error(e2 = void 0) {
          if (!IsReadableStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException$1("error");
          }
          ReadableStreamDefaultControllerError(this, e2);
        }
        /** @internal */
        [CancelSteps](reason) {
          ResetQueue(this);
          const result = this._cancelAlgorithm(reason);
          ReadableStreamDefaultControllerClearAlgorithms(this);
          return result;
        }
        /** @internal */
        [PullSteps](readRequest) {
          const stream = this._controlledReadableStream;
          if (this._queue.length > 0) {
            const chunk = DequeueValue(this);
            if (this._closeRequested && this._queue.length === 0) {
              ReadableStreamDefaultControllerClearAlgorithms(this);
              ReadableStreamClose(stream);
            } else {
              ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
            readRequest._chunkSteps(chunk);
          } else {
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableStreamDefaultControllerCallPullIfNeeded(this);
          }
        }
        /** @internal */
        [ReleaseSteps]() {
        }
      }
      Object.defineProperties(ReadableStreamDefaultController.prototype, {
        close: { enumerable: true },
        enqueue: { enumerable: true },
        error: { enumerable: true },
        desiredSize: { enumerable: true }
      });
      setFunctionName(ReadableStreamDefaultController.prototype.close, "close");
      setFunctionName(ReadableStreamDefaultController.prototype.enqueue, "enqueue");
      setFunctionName(ReadableStreamDefaultController.prototype.error, "error");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ReadableStreamDefaultController.prototype, Symbol.toStringTag, {
          value: "ReadableStreamDefaultController",
          configurable: true
        });
      }
      function IsReadableStreamDefaultController(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_controlledReadableStream")) {
          return false;
        }
        return x2 instanceof ReadableStreamDefaultController;
      }
      function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
        const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
        if (!shouldPull) {
          return;
        }
        if (controller._pulling) {
          controller._pullAgain = true;
          return;
        }
        controller._pulling = true;
        const pullPromise = controller._pullAlgorithm();
        uponPromise(pullPromise, () => {
          controller._pulling = false;
          if (controller._pullAgain) {
            controller._pullAgain = false;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          }
          return null;
        }, (e2) => {
          ReadableStreamDefaultControllerError(controller, e2);
          return null;
        });
      }
      function ReadableStreamDefaultControllerShouldCallPull(controller) {
        const stream = controller._controlledReadableStream;
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
          return false;
        }
        if (!controller._started) {
          return false;
        }
        if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
          return true;
        }
        const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
        if (desiredSize > 0) {
          return true;
        }
        return false;
      }
      function ReadableStreamDefaultControllerClearAlgorithms(controller) {
        controller._pullAlgorithm = void 0;
        controller._cancelAlgorithm = void 0;
        controller._strategySizeAlgorithm = void 0;
      }
      function ReadableStreamDefaultControllerClose(controller) {
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
          return;
        }
        const stream = controller._controlledReadableStream;
        controller._closeRequested = true;
        if (controller._queue.length === 0) {
          ReadableStreamDefaultControllerClearAlgorithms(controller);
          ReadableStreamClose(stream);
        }
      }
      function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
          return;
        }
        const stream = controller._controlledReadableStream;
        if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
          ReadableStreamFulfillReadRequest(stream, chunk, false);
        } else {
          let chunkSize;
          try {
            chunkSize = controller._strategySizeAlgorithm(chunk);
          } catch (chunkSizeE) {
            ReadableStreamDefaultControllerError(controller, chunkSizeE);
            throw chunkSizeE;
          }
          try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
          } catch (enqueueE) {
            ReadableStreamDefaultControllerError(controller, enqueueE);
            throw enqueueE;
          }
        }
        ReadableStreamDefaultControllerCallPullIfNeeded(controller);
      }
      function ReadableStreamDefaultControllerError(controller, e2) {
        const stream = controller._controlledReadableStream;
        if (stream._state !== "readable") {
          return;
        }
        ResetQueue(controller);
        ReadableStreamDefaultControllerClearAlgorithms(controller);
        ReadableStreamError(stream, e2);
      }
      function ReadableStreamDefaultControllerGetDesiredSize(controller) {
        const state = controller._controlledReadableStream._state;
        if (state === "errored") {
          return null;
        }
        if (state === "closed") {
          return 0;
        }
        return controller._strategyHWM - controller._queueTotalSize;
      }
      function ReadableStreamDefaultControllerHasBackpressure(controller) {
        if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
          return false;
        }
        return true;
      }
      function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
        const state = controller._controlledReadableStream._state;
        if (!controller._closeRequested && state === "readable") {
          return true;
        }
        return false;
      }
      function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
        controller._controlledReadableStream = stream;
        controller._queue = void 0;
        controller._queueTotalSize = void 0;
        ResetQueue(controller);
        controller._started = false;
        controller._closeRequested = false;
        controller._pullAgain = false;
        controller._pulling = false;
        controller._strategySizeAlgorithm = sizeAlgorithm;
        controller._strategyHWM = highWaterMark;
        controller._pullAlgorithm = pullAlgorithm;
        controller._cancelAlgorithm = cancelAlgorithm;
        stream._readableStreamController = controller;
        const startResult = startAlgorithm();
        uponPromise(promiseResolvedWith(startResult), () => {
          controller._started = true;
          ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          return null;
        }, (r2) => {
          ReadableStreamDefaultControllerError(controller, r2);
          return null;
        });
      }
      function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
        const controller = Object.create(ReadableStreamDefaultController.prototype);
        let startAlgorithm;
        let pullAlgorithm;
        let cancelAlgorithm;
        if (underlyingSource.start !== void 0) {
          startAlgorithm = () => underlyingSource.start(controller);
        } else {
          startAlgorithm = () => void 0;
        }
        if (underlyingSource.pull !== void 0) {
          pullAlgorithm = () => underlyingSource.pull(controller);
        } else {
          pullAlgorithm = () => promiseResolvedWith(void 0);
        }
        if (underlyingSource.cancel !== void 0) {
          cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
        } else {
          cancelAlgorithm = () => promiseResolvedWith(void 0);
        }
        SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
      }
      function defaultControllerBrandCheckException$1(name) {
        return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
      }
      function ReadableStreamTee(stream, cloneForBranch2) {
        if (IsReadableByteStreamController(stream._readableStreamController)) {
          return ReadableByteStreamTee(stream);
        }
        return ReadableStreamDefaultTee(stream);
      }
      function ReadableStreamDefaultTee(stream, cloneForBranch2) {
        const reader = AcquireReadableStreamDefaultReader(stream);
        let reading = false;
        let readAgain = false;
        let canceled1 = false;
        let canceled2 = false;
        let reason1;
        let reason2;
        let branch1;
        let branch2;
        let resolveCancelPromise;
        const cancelPromise = newPromise((resolve) => {
          resolveCancelPromise = resolve;
        });
        function pullAlgorithm() {
          if (reading) {
            readAgain = true;
            return promiseResolvedWith(void 0);
          }
          reading = true;
          const readRequest = {
            _chunkSteps: (chunk) => {
              _queueMicrotask(() => {
                readAgain = false;
                const chunk1 = chunk;
                const chunk2 = chunk;
                if (!canceled1) {
                  ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                }
                if (!canceled2) {
                  ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                }
                reading = false;
                if (readAgain) {
                  pullAlgorithm();
                }
              });
            },
            _closeSteps: () => {
              reading = false;
              if (!canceled1) {
                ReadableStreamDefaultControllerClose(branch1._readableStreamController);
              }
              if (!canceled2) {
                ReadableStreamDefaultControllerClose(branch2._readableStreamController);
              }
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            },
            _errorSteps: () => {
              reading = false;
            }
          };
          ReadableStreamDefaultReaderRead(reader, readRequest);
          return promiseResolvedWith(void 0);
        }
        function cancel1Algorithm(reason) {
          canceled1 = true;
          reason1 = reason;
          if (canceled2) {
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
          }
          return cancelPromise;
        }
        function cancel2Algorithm(reason) {
          canceled2 = true;
          reason2 = reason;
          if (canceled1) {
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
          }
          return cancelPromise;
        }
        function startAlgorithm() {
        }
        branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
        branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
        uponRejection(reader._closedPromise, (r2) => {
          ReadableStreamDefaultControllerError(branch1._readableStreamController, r2);
          ReadableStreamDefaultControllerError(branch2._readableStreamController, r2);
          if (!canceled1 || !canceled2) {
            resolveCancelPromise(void 0);
          }
          return null;
        });
        return [branch1, branch2];
      }
      function ReadableByteStreamTee(stream) {
        let reader = AcquireReadableStreamDefaultReader(stream);
        let reading = false;
        let readAgainForBranch1 = false;
        let readAgainForBranch2 = false;
        let canceled1 = false;
        let canceled2 = false;
        let reason1;
        let reason2;
        let branch1;
        let branch2;
        let resolveCancelPromise;
        const cancelPromise = newPromise((resolve) => {
          resolveCancelPromise = resolve;
        });
        function forwardReaderError(thisReader) {
          uponRejection(thisReader._closedPromise, (r2) => {
            if (thisReader !== reader) {
              return null;
            }
            ReadableByteStreamControllerError(branch1._readableStreamController, r2);
            ReadableByteStreamControllerError(branch2._readableStreamController, r2);
            if (!canceled1 || !canceled2) {
              resolveCancelPromise(void 0);
            }
            return null;
          });
        }
        function pullWithDefaultReader() {
          if (IsReadableStreamBYOBReader(reader)) {
            ReadableStreamReaderGenericRelease(reader);
            reader = AcquireReadableStreamDefaultReader(stream);
            forwardReaderError(reader);
          }
          const readRequest = {
            _chunkSteps: (chunk) => {
              _queueMicrotask(() => {
                readAgainForBranch1 = false;
                readAgainForBranch2 = false;
                const chunk1 = chunk;
                let chunk2 = chunk;
                if (!canceled1 && !canceled2) {
                  try {
                    chunk2 = CloneAsUint8Array(chunk);
                  } catch (cloneE) {
                    ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                    ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                    resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                    return;
                  }
                }
                if (!canceled1) {
                  ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                }
                if (!canceled2) {
                  ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                }
                reading = false;
                if (readAgainForBranch1) {
                  pull1Algorithm();
                } else if (readAgainForBranch2) {
                  pull2Algorithm();
                }
              });
            },
            _closeSteps: () => {
              reading = false;
              if (!canceled1) {
                ReadableByteStreamControllerClose(branch1._readableStreamController);
              }
              if (!canceled2) {
                ReadableByteStreamControllerClose(branch2._readableStreamController);
              }
              if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
              }
              if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
              }
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            },
            _errorSteps: () => {
              reading = false;
            }
          };
          ReadableStreamDefaultReaderRead(reader, readRequest);
        }
        function pullWithBYOBReader(view, forBranch2) {
          if (IsReadableStreamDefaultReader(reader)) {
            ReadableStreamReaderGenericRelease(reader);
            reader = AcquireReadableStreamBYOBReader(stream);
            forwardReaderError(reader);
          }
          const byobBranch = forBranch2 ? branch2 : branch1;
          const otherBranch = forBranch2 ? branch1 : branch2;
          const readIntoRequest = {
            _chunkSteps: (chunk) => {
              _queueMicrotask(() => {
                readAgainForBranch1 = false;
                readAgainForBranch2 = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!otherCanceled) {
                  let clonedChunk;
                  try {
                    clonedChunk = CloneAsUint8Array(chunk);
                  } catch (cloneE) {
                    ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                    ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                    resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                    return;
                  }
                  if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                  ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                } else if (!byobCanceled) {
                  ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                }
                reading = false;
                if (readAgainForBranch1) {
                  pull1Algorithm();
                } else if (readAgainForBranch2) {
                  pull2Algorithm();
                }
              });
            },
            _closeSteps: (chunk) => {
              reading = false;
              const byobCanceled = forBranch2 ? canceled2 : canceled1;
              const otherCanceled = forBranch2 ? canceled1 : canceled2;
              if (!byobCanceled) {
                ReadableByteStreamControllerClose(byobBranch._readableStreamController);
              }
              if (!otherCanceled) {
                ReadableByteStreamControllerClose(otherBranch._readableStreamController);
              }
              if (chunk !== void 0) {
                if (!byobCanceled) {
                  ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                }
                if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                }
              }
              if (!byobCanceled || !otherCanceled) {
                resolveCancelPromise(void 0);
              }
            },
            _errorSteps: () => {
              reading = false;
            }
          };
          ReadableStreamBYOBReaderRead(reader, view, 1, readIntoRequest);
        }
        function pull1Algorithm() {
          if (reading) {
            readAgainForBranch1 = true;
            return promiseResolvedWith(void 0);
          }
          reading = true;
          const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
          if (byobRequest === null) {
            pullWithDefaultReader();
          } else {
            pullWithBYOBReader(byobRequest._view, false);
          }
          return promiseResolvedWith(void 0);
        }
        function pull2Algorithm() {
          if (reading) {
            readAgainForBranch2 = true;
            return promiseResolvedWith(void 0);
          }
          reading = true;
          const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
          if (byobRequest === null) {
            pullWithDefaultReader();
          } else {
            pullWithBYOBReader(byobRequest._view, true);
          }
          return promiseResolvedWith(void 0);
        }
        function cancel1Algorithm(reason) {
          canceled1 = true;
          reason1 = reason;
          if (canceled2) {
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
          }
          return cancelPromise;
        }
        function cancel2Algorithm(reason) {
          canceled2 = true;
          reason2 = reason;
          if (canceled1) {
            const compositeReason = CreateArrayFromList([reason1, reason2]);
            const cancelResult = ReadableStreamCancel(stream, compositeReason);
            resolveCancelPromise(cancelResult);
          }
          return cancelPromise;
        }
        function startAlgorithm() {
          return;
        }
        branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
        branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
        forwardReaderError(reader);
        return [branch1, branch2];
      }
      function isReadableStreamLike(stream) {
        return typeIsObject(stream) && typeof stream.getReader !== "undefined";
      }
      function ReadableStreamFrom(source) {
        if (isReadableStreamLike(source)) {
          return ReadableStreamFromDefaultReader(source.getReader());
        }
        return ReadableStreamFromIterable(source);
      }
      function ReadableStreamFromIterable(asyncIterable) {
        let stream;
        const iteratorRecord = GetIterator(asyncIterable, "async");
        const startAlgorithm = noop2;
        function pullAlgorithm() {
          let nextResult;
          try {
            nextResult = IteratorNext(iteratorRecord);
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
          const nextPromise = promiseResolvedWith(nextResult);
          return transformPromiseWith(nextPromise, (iterResult) => {
            if (!typeIsObject(iterResult)) {
              throw new TypeError("The promise returned by the iterator.next() method must fulfill with an object");
            }
            const done = IteratorComplete(iterResult);
            if (done) {
              ReadableStreamDefaultControllerClose(stream._readableStreamController);
            } else {
              const value = IteratorValue(iterResult);
              ReadableStreamDefaultControllerEnqueue(stream._readableStreamController, value);
            }
          });
        }
        function cancelAlgorithm(reason) {
          const iterator = iteratorRecord.iterator;
          let returnMethod;
          try {
            returnMethod = GetMethod(iterator, "return");
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
          if (returnMethod === void 0) {
            return promiseResolvedWith(void 0);
          }
          let returnResult;
          try {
            returnResult = reflectCall(returnMethod, iterator, [reason]);
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
          const returnPromise = promiseResolvedWith(returnResult);
          return transformPromiseWith(returnPromise, (iterResult) => {
            if (!typeIsObject(iterResult)) {
              throw new TypeError("The promise returned by the iterator.return() method must fulfill with an object");
            }
            return void 0;
          });
        }
        stream = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, 0);
        return stream;
      }
      function ReadableStreamFromDefaultReader(reader) {
        let stream;
        const startAlgorithm = noop2;
        function pullAlgorithm() {
          let readPromise;
          try {
            readPromise = reader.read();
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
          return transformPromiseWith(readPromise, (readResult) => {
            if (!typeIsObject(readResult)) {
              throw new TypeError("The promise returned by the reader.read() method must fulfill with an object");
            }
            if (readResult.done) {
              ReadableStreamDefaultControllerClose(stream._readableStreamController);
            } else {
              const value = readResult.value;
              ReadableStreamDefaultControllerEnqueue(stream._readableStreamController, value);
            }
          });
        }
        function cancelAlgorithm(reason) {
          try {
            return promiseResolvedWith(reader.cancel(reason));
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
        }
        stream = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, 0);
        return stream;
      }
      function convertUnderlyingDefaultOrByteSource(source, context) {
        assertDictionary(source, context);
        const original = source;
        const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
        const cancel = original === null || original === void 0 ? void 0 : original.cancel;
        const pull = original === null || original === void 0 ? void 0 : original.pull;
        const start = original === null || original === void 0 ? void 0 : original.start;
        const type = original === null || original === void 0 ? void 0 : original.type;
        return {
          autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
          cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
          pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
          start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
          type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
        };
      }
      function convertUnderlyingSourceCancelCallback(fn, original, context) {
        assertFunction(fn, context);
        return (reason) => promiseCall(fn, original, [reason]);
      }
      function convertUnderlyingSourcePullCallback(fn, original, context) {
        assertFunction(fn, context);
        return (controller) => promiseCall(fn, original, [controller]);
      }
      function convertUnderlyingSourceStartCallback(fn, original, context) {
        assertFunction(fn, context);
        return (controller) => reflectCall(fn, original, [controller]);
      }
      function convertReadableStreamType(type, context) {
        type = `${type}`;
        if (type !== "bytes") {
          throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
        }
        return type;
      }
      function convertIteratorOptions(options, context) {
        assertDictionary(options, context);
        const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
        return { preventCancel: Boolean(preventCancel) };
      }
      function convertPipeOptions(options, context) {
        assertDictionary(options, context);
        const preventAbort = options === null || options === void 0 ? void 0 : options.preventAbort;
        const preventCancel = options === null || options === void 0 ? void 0 : options.preventCancel;
        const preventClose = options === null || options === void 0 ? void 0 : options.preventClose;
        const signal = options === null || options === void 0 ? void 0 : options.signal;
        if (signal !== void 0) {
          assertAbortSignal(signal, `${context} has member 'signal' that`);
        }
        return {
          preventAbort: Boolean(preventAbort),
          preventCancel: Boolean(preventCancel),
          preventClose: Boolean(preventClose),
          signal
        };
      }
      function assertAbortSignal(signal, context) {
        if (!isAbortSignal2(signal)) {
          throw new TypeError(`${context} is not an AbortSignal.`);
        }
      }
      function convertReadableWritablePair(pair, context) {
        assertDictionary(pair, context);
        const readable = pair === null || pair === void 0 ? void 0 : pair.readable;
        assertRequiredField(readable, "readable", "ReadableWritablePair");
        assertReadableStream(readable, `${context} has member 'readable' that`);
        const writable = pair === null || pair === void 0 ? void 0 : pair.writable;
        assertRequiredField(writable, "writable", "ReadableWritablePair");
        assertWritableStream(writable, `${context} has member 'writable' that`);
        return { readable, writable };
      }
      class ReadableStream2 {
        constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
          if (rawUnderlyingSource === void 0) {
            rawUnderlyingSource = null;
          } else {
            assertObject(rawUnderlyingSource, "First parameter");
          }
          const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
          const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
          InitializeReadableStream(this);
          if (underlyingSource.type === "bytes") {
            if (strategy.size !== void 0) {
              throw new RangeError("The strategy for a byte stream cannot have a size function");
            }
            const highWaterMark = ExtractHighWaterMark(strategy, 0);
            SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
          } else {
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
          }
        }
        /**
         * Whether or not the readable stream is locked to a {@link ReadableStreamDefaultReader | reader}.
         */
        get locked() {
          if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1("locked");
          }
          return IsReadableStreamLocked(this);
        }
        /**
         * Cancels the stream, signaling a loss of interest in the stream by a consumer.
         *
         * The supplied `reason` argument will be given to the underlying source's {@link UnderlyingSource.cancel | cancel()}
         * method, which might or might not use it.
         */
        cancel(reason = void 0) {
          if (!IsReadableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$1("cancel"));
          }
          if (IsReadableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError("Cannot cancel a stream that already has a reader"));
          }
          return ReadableStreamCancel(this, reason);
        }
        getReader(rawOptions = void 0) {
          if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1("getReader");
          }
          const options = convertReaderOptions(rawOptions, "First parameter");
          if (options.mode === void 0) {
            return AcquireReadableStreamDefaultReader(this);
          }
          return AcquireReadableStreamBYOBReader(this);
        }
        pipeThrough(rawTransform, rawOptions = {}) {
          if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1("pipeThrough");
          }
          assertRequiredArgument(rawTransform, 1, "pipeThrough");
          const transform = convertReadableWritablePair(rawTransform, "First parameter");
          const options = convertPipeOptions(rawOptions, "Second parameter");
          if (IsReadableStreamLocked(this)) {
            throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
          }
          if (IsWritableStreamLocked(transform.writable)) {
            throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
          }
          const promise = ReadableStreamPipeTo(this, transform.writable, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
          setPromiseIsHandledToTrue(promise);
          return transform.readable;
        }
        pipeTo(destination, rawOptions = {}) {
          if (!IsReadableStream(this)) {
            return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
          }
          if (destination === void 0) {
            return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
          }
          if (!IsWritableStream(destination)) {
            return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
          }
          let options;
          try {
            options = convertPipeOptions(rawOptions, "Second parameter");
          } catch (e2) {
            return promiseRejectedWith(e2);
          }
          if (IsReadableStreamLocked(this)) {
            return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
          }
          if (IsWritableStreamLocked(destination)) {
            return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
          }
          return ReadableStreamPipeTo(this, destination, options.preventClose, options.preventAbort, options.preventCancel, options.signal);
        }
        /**
         * Tees this readable stream, returning a two-element array containing the two resulting branches as
         * new {@link ReadableStream} instances.
         *
         * Teeing a stream will lock it, preventing any other consumer from acquiring a reader.
         * To cancel the stream, cancel both of the resulting branches; a composite cancellation reason will then be
         * propagated to the stream's underlying source.
         *
         * Note that the chunks seen in each branch will be the same object. If the chunks are not immutable,
         * this could allow interference between the two branches.
         */
        tee() {
          if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1("tee");
          }
          const branches = ReadableStreamTee(this);
          return CreateArrayFromList(branches);
        }
        values(rawOptions = void 0) {
          if (!IsReadableStream(this)) {
            throw streamBrandCheckException$1("values");
          }
          const options = convertIteratorOptions(rawOptions, "First parameter");
          return AcquireReadableStreamAsyncIterator(this, options.preventCancel);
        }
        [SymbolAsyncIterator](options) {
          return this.values(options);
        }
        /**
         * Creates a new ReadableStream wrapping the provided iterable or async iterable.
         *
         * This can be used to adapt various kinds of objects into a readable stream,
         * such as an array, an async generator, or a Node.js readable stream.
         */
        static from(asyncIterable) {
          return ReadableStreamFrom(asyncIterable);
        }
      }
      Object.defineProperties(ReadableStream2, {
        from: { enumerable: true }
      });
      Object.defineProperties(ReadableStream2.prototype, {
        cancel: { enumerable: true },
        getReader: { enumerable: true },
        pipeThrough: { enumerable: true },
        pipeTo: { enumerable: true },
        tee: { enumerable: true },
        values: { enumerable: true },
        locked: { enumerable: true }
      });
      setFunctionName(ReadableStream2.from, "from");
      setFunctionName(ReadableStream2.prototype.cancel, "cancel");
      setFunctionName(ReadableStream2.prototype.getReader, "getReader");
      setFunctionName(ReadableStream2.prototype.pipeThrough, "pipeThrough");
      setFunctionName(ReadableStream2.prototype.pipeTo, "pipeTo");
      setFunctionName(ReadableStream2.prototype.tee, "tee");
      setFunctionName(ReadableStream2.prototype.values, "values");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ReadableStream2.prototype, Symbol.toStringTag, {
          value: "ReadableStream",
          configurable: true
        });
      }
      Object.defineProperty(ReadableStream2.prototype, SymbolAsyncIterator, {
        value: ReadableStream2.prototype.values,
        writable: true,
        configurable: true
      });
      function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
        const stream = Object.create(ReadableStream2.prototype);
        InitializeReadableStream(stream);
        const controller = Object.create(ReadableStreamDefaultController.prototype);
        SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
        return stream;
      }
      function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
        const stream = Object.create(ReadableStream2.prototype);
        InitializeReadableStream(stream);
        const controller = Object.create(ReadableByteStreamController.prototype);
        SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
        return stream;
      }
      function InitializeReadableStream(stream) {
        stream._state = "readable";
        stream._reader = void 0;
        stream._storedError = void 0;
        stream._disturbed = false;
      }
      function IsReadableStream(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_readableStreamController")) {
          return false;
        }
        return x2 instanceof ReadableStream2;
      }
      function IsReadableStreamLocked(stream) {
        if (stream._reader === void 0) {
          return false;
        }
        return true;
      }
      function ReadableStreamCancel(stream, reason) {
        stream._disturbed = true;
        if (stream._state === "closed") {
          return promiseResolvedWith(void 0);
        }
        if (stream._state === "errored") {
          return promiseRejectedWith(stream._storedError);
        }
        ReadableStreamClose(stream);
        const reader = stream._reader;
        if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
          const readIntoRequests = reader._readIntoRequests;
          reader._readIntoRequests = new SimpleQueue();
          readIntoRequests.forEach((readIntoRequest) => {
            readIntoRequest._closeSteps(void 0);
          });
        }
        const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
        return transformPromiseWith(sourceCancelPromise, noop2);
      }
      function ReadableStreamClose(stream) {
        stream._state = "closed";
        const reader = stream._reader;
        if (reader === void 0) {
          return;
        }
        defaultReaderClosedPromiseResolve(reader);
        if (IsReadableStreamDefaultReader(reader)) {
          const readRequests = reader._readRequests;
          reader._readRequests = new SimpleQueue();
          readRequests.forEach((readRequest) => {
            readRequest._closeSteps();
          });
        }
      }
      function ReadableStreamError(stream, e2) {
        stream._state = "errored";
        stream._storedError = e2;
        const reader = stream._reader;
        if (reader === void 0) {
          return;
        }
        defaultReaderClosedPromiseReject(reader, e2);
        if (IsReadableStreamDefaultReader(reader)) {
          ReadableStreamDefaultReaderErrorReadRequests(reader, e2);
        } else {
          ReadableStreamBYOBReaderErrorReadIntoRequests(reader, e2);
        }
      }
      function streamBrandCheckException$1(name) {
        return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
      }
      function convertQueuingStrategyInit(init, context) {
        assertDictionary(init, context);
        const highWaterMark = init === null || init === void 0 ? void 0 : init.highWaterMark;
        assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
        return {
          highWaterMark: convertUnrestrictedDouble(highWaterMark)
        };
      }
      const byteLengthSizeFunction = (chunk) => {
        return chunk.byteLength;
      };
      setFunctionName(byteLengthSizeFunction, "size");
      class ByteLengthQueuingStrategy {
        constructor(options) {
          assertRequiredArgument(options, 1, "ByteLengthQueuingStrategy");
          options = convertQueuingStrategyInit(options, "First parameter");
          this._byteLengthQueuingStrategyHighWaterMark = options.highWaterMark;
        }
        /**
         * Returns the high water mark provided to the constructor.
         */
        get highWaterMark() {
          if (!IsByteLengthQueuingStrategy(this)) {
            throw byteLengthBrandCheckException("highWaterMark");
          }
          return this._byteLengthQueuingStrategyHighWaterMark;
        }
        /**
         * Measures the size of `chunk` by returning the value of its `byteLength` property.
         */
        get size() {
          if (!IsByteLengthQueuingStrategy(this)) {
            throw byteLengthBrandCheckException("size");
          }
          return byteLengthSizeFunction;
        }
      }
      Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
        highWaterMark: { enumerable: true },
        size: { enumerable: true }
      });
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(ByteLengthQueuingStrategy.prototype, Symbol.toStringTag, {
          value: "ByteLengthQueuingStrategy",
          configurable: true
        });
      }
      function byteLengthBrandCheckException(name) {
        return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
      }
      function IsByteLengthQueuingStrategy(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_byteLengthQueuingStrategyHighWaterMark")) {
          return false;
        }
        return x2 instanceof ByteLengthQueuingStrategy;
      }
      const countSizeFunction = () => {
        return 1;
      };
      setFunctionName(countSizeFunction, "size");
      class CountQueuingStrategy {
        constructor(options) {
          assertRequiredArgument(options, 1, "CountQueuingStrategy");
          options = convertQueuingStrategyInit(options, "First parameter");
          this._countQueuingStrategyHighWaterMark = options.highWaterMark;
        }
        /**
         * Returns the high water mark provided to the constructor.
         */
        get highWaterMark() {
          if (!IsCountQueuingStrategy(this)) {
            throw countBrandCheckException("highWaterMark");
          }
          return this._countQueuingStrategyHighWaterMark;
        }
        /**
         * Measures the size of `chunk` by always returning 1.
         * This ensures that the total queue size is a count of the number of chunks in the queue.
         */
        get size() {
          if (!IsCountQueuingStrategy(this)) {
            throw countBrandCheckException("size");
          }
          return countSizeFunction;
        }
      }
      Object.defineProperties(CountQueuingStrategy.prototype, {
        highWaterMark: { enumerable: true },
        size: { enumerable: true }
      });
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(CountQueuingStrategy.prototype, Symbol.toStringTag, {
          value: "CountQueuingStrategy",
          configurable: true
        });
      }
      function countBrandCheckException(name) {
        return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
      }
      function IsCountQueuingStrategy(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_countQueuingStrategyHighWaterMark")) {
          return false;
        }
        return x2 instanceof CountQueuingStrategy;
      }
      function convertTransformer(original, context) {
        assertDictionary(original, context);
        const cancel = original === null || original === void 0 ? void 0 : original.cancel;
        const flush = original === null || original === void 0 ? void 0 : original.flush;
        const readableType = original === null || original === void 0 ? void 0 : original.readableType;
        const start = original === null || original === void 0 ? void 0 : original.start;
        const transform = original === null || original === void 0 ? void 0 : original.transform;
        const writableType = original === null || original === void 0 ? void 0 : original.writableType;
        return {
          cancel: cancel === void 0 ? void 0 : convertTransformerCancelCallback(cancel, original, `${context} has member 'cancel' that`),
          flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
          readableType,
          start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
          transform: transform === void 0 ? void 0 : convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
          writableType
        };
      }
      function convertTransformerFlushCallback(fn, original, context) {
        assertFunction(fn, context);
        return (controller) => promiseCall(fn, original, [controller]);
      }
      function convertTransformerStartCallback(fn, original, context) {
        assertFunction(fn, context);
        return (controller) => reflectCall(fn, original, [controller]);
      }
      function convertTransformerTransformCallback(fn, original, context) {
        assertFunction(fn, context);
        return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
      }
      function convertTransformerCancelCallback(fn, original, context) {
        assertFunction(fn, context);
        return (reason) => promiseCall(fn, original, [reason]);
      }
      class TransformStream {
        constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
          if (rawTransformer === void 0) {
            rawTransformer = null;
          }
          const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
          const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
          const transformer = convertTransformer(rawTransformer, "First parameter");
          if (transformer.readableType !== void 0) {
            throw new RangeError("Invalid readableType specified");
          }
          if (transformer.writableType !== void 0) {
            throw new RangeError("Invalid writableType specified");
          }
          const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
          const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
          const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
          const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
          let startPromise_resolve;
          const startPromise = newPromise((resolve) => {
            startPromise_resolve = resolve;
          });
          InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
          SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
          if (transformer.start !== void 0) {
            startPromise_resolve(transformer.start(this._transformStreamController));
          } else {
            startPromise_resolve(void 0);
          }
        }
        /**
         * The readable side of the transform stream.
         */
        get readable() {
          if (!IsTransformStream(this)) {
            throw streamBrandCheckException("readable");
          }
          return this._readable;
        }
        /**
         * The writable side of the transform stream.
         */
        get writable() {
          if (!IsTransformStream(this)) {
            throw streamBrandCheckException("writable");
          }
          return this._writable;
        }
      }
      Object.defineProperties(TransformStream.prototype, {
        readable: { enumerable: true },
        writable: { enumerable: true }
      });
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(TransformStream.prototype, Symbol.toStringTag, {
          value: "TransformStream",
          configurable: true
        });
      }
      function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
        function startAlgorithm() {
          return startPromise;
        }
        function writeAlgorithm(chunk) {
          return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
        }
        function abortAlgorithm(reason) {
          return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
        }
        function closeAlgorithm() {
          return TransformStreamDefaultSinkCloseAlgorithm(stream);
        }
        stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
        function pullAlgorithm() {
          return TransformStreamDefaultSourcePullAlgorithm(stream);
        }
        function cancelAlgorithm(reason) {
          return TransformStreamDefaultSourceCancelAlgorithm(stream, reason);
        }
        stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
        stream._backpressure = void 0;
        stream._backpressureChangePromise = void 0;
        stream._backpressureChangePromise_resolve = void 0;
        TransformStreamSetBackpressure(stream, true);
        stream._transformStreamController = void 0;
      }
      function IsTransformStream(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_transformStreamController")) {
          return false;
        }
        return x2 instanceof TransformStream;
      }
      function TransformStreamError(stream, e2) {
        ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e2);
        TransformStreamErrorWritableAndUnblockWrite(stream, e2);
      }
      function TransformStreamErrorWritableAndUnblockWrite(stream, e2) {
        TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
        WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e2);
        TransformStreamUnblockWrite(stream);
      }
      function TransformStreamUnblockWrite(stream) {
        if (stream._backpressure) {
          TransformStreamSetBackpressure(stream, false);
        }
      }
      function TransformStreamSetBackpressure(stream, backpressure) {
        if (stream._backpressureChangePromise !== void 0) {
          stream._backpressureChangePromise_resolve();
        }
        stream._backpressureChangePromise = newPromise((resolve) => {
          stream._backpressureChangePromise_resolve = resolve;
        });
        stream._backpressure = backpressure;
      }
      class TransformStreamDefaultController {
        constructor() {
          throw new TypeError("Illegal constructor");
        }
        /**
         * Returns the desired size to fill the readable side’s internal queue. It can be negative, if the queue is over-full.
         */
        get desiredSize() {
          if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException("desiredSize");
          }
          const readableController = this._controlledTransformStream._readable._readableStreamController;
          return ReadableStreamDefaultControllerGetDesiredSize(readableController);
        }
        enqueue(chunk = void 0) {
          if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException("enqueue");
          }
          TransformStreamDefaultControllerEnqueue(this, chunk);
        }
        /**
         * Errors both the readable side and the writable side of the controlled transform stream, making all future
         * interactions with it fail with the given error `e`. Any chunks queued for transformation will be discarded.
         */
        error(reason = void 0) {
          if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException("error");
          }
          TransformStreamDefaultControllerError(this, reason);
        }
        /**
         * Closes the readable side and errors the writable side of the controlled transform stream. This is useful when the
         * transformer only needs to consume a portion of the chunks written to the writable side.
         */
        terminate() {
          if (!IsTransformStreamDefaultController(this)) {
            throw defaultControllerBrandCheckException("terminate");
          }
          TransformStreamDefaultControllerTerminate(this);
        }
      }
      Object.defineProperties(TransformStreamDefaultController.prototype, {
        enqueue: { enumerable: true },
        error: { enumerable: true },
        terminate: { enumerable: true },
        desiredSize: { enumerable: true }
      });
      setFunctionName(TransformStreamDefaultController.prototype.enqueue, "enqueue");
      setFunctionName(TransformStreamDefaultController.prototype.error, "error");
      setFunctionName(TransformStreamDefaultController.prototype.terminate, "terminate");
      if (typeof Symbol.toStringTag === "symbol") {
        Object.defineProperty(TransformStreamDefaultController.prototype, Symbol.toStringTag, {
          value: "TransformStreamDefaultController",
          configurable: true
        });
      }
      function IsTransformStreamDefaultController(x2) {
        if (!typeIsObject(x2)) {
          return false;
        }
        if (!Object.prototype.hasOwnProperty.call(x2, "_controlledTransformStream")) {
          return false;
        }
        return x2 instanceof TransformStreamDefaultController;
      }
      function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm, cancelAlgorithm) {
        controller._controlledTransformStream = stream;
        stream._transformStreamController = controller;
        controller._transformAlgorithm = transformAlgorithm;
        controller._flushAlgorithm = flushAlgorithm;
        controller._cancelAlgorithm = cancelAlgorithm;
        controller._finishPromise = void 0;
        controller._finishPromise_resolve = void 0;
        controller._finishPromise_reject = void 0;
      }
      function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
        const controller = Object.create(TransformStreamDefaultController.prototype);
        let transformAlgorithm;
        let flushAlgorithm;
        let cancelAlgorithm;
        if (transformer.transform !== void 0) {
          transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
        } else {
          transformAlgorithm = (chunk) => {
            try {
              TransformStreamDefaultControllerEnqueue(controller, chunk);
              return promiseResolvedWith(void 0);
            } catch (transformResultE) {
              return promiseRejectedWith(transformResultE);
            }
          };
        }
        if (transformer.flush !== void 0) {
          flushAlgorithm = () => transformer.flush(controller);
        } else {
          flushAlgorithm = () => promiseResolvedWith(void 0);
        }
        if (transformer.cancel !== void 0) {
          cancelAlgorithm = (reason) => transformer.cancel(reason);
        } else {
          cancelAlgorithm = () => promiseResolvedWith(void 0);
        }
        SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm, cancelAlgorithm);
      }
      function TransformStreamDefaultControllerClearAlgorithms(controller) {
        controller._transformAlgorithm = void 0;
        controller._flushAlgorithm = void 0;
        controller._cancelAlgorithm = void 0;
      }
      function TransformStreamDefaultControllerEnqueue(controller, chunk) {
        const stream = controller._controlledTransformStream;
        const readableController = stream._readable._readableStreamController;
        if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
          throw new TypeError("Readable side is not in a state that permits enqueue");
        }
        try {
          ReadableStreamDefaultControllerEnqueue(readableController, chunk);
        } catch (e2) {
          TransformStreamErrorWritableAndUnblockWrite(stream, e2);
          throw stream._readable._storedError;
        }
        const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
        if (backpressure !== stream._backpressure) {
          TransformStreamSetBackpressure(stream, true);
        }
      }
      function TransformStreamDefaultControllerError(controller, e2) {
        TransformStreamError(controller._controlledTransformStream, e2);
      }
      function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
        const transformPromise = controller._transformAlgorithm(chunk);
        return transformPromiseWith(transformPromise, void 0, (r2) => {
          TransformStreamError(controller._controlledTransformStream, r2);
          throw r2;
        });
      }
      function TransformStreamDefaultControllerTerminate(controller) {
        const stream = controller._controlledTransformStream;
        const readableController = stream._readable._readableStreamController;
        ReadableStreamDefaultControllerClose(readableController);
        const error = new TypeError("TransformStream terminated");
        TransformStreamErrorWritableAndUnblockWrite(stream, error);
      }
      function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
        const controller = stream._transformStreamController;
        if (stream._backpressure) {
          const backpressureChangePromise = stream._backpressureChangePromise;
          return transformPromiseWith(backpressureChangePromise, () => {
            const writable = stream._writable;
            const state = writable._state;
            if (state === "erroring") {
              throw writable._storedError;
            }
            return TransformStreamDefaultControllerPerformTransform(controller, chunk);
          });
        }
        return TransformStreamDefaultControllerPerformTransform(controller, chunk);
      }
      function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
        const controller = stream._transformStreamController;
        if (controller._finishPromise !== void 0) {
          return controller._finishPromise;
        }
        const readable = stream._readable;
        controller._finishPromise = newPromise((resolve, reject) => {
          controller._finishPromise_resolve = resolve;
          controller._finishPromise_reject = reject;
        });
        const cancelPromise = controller._cancelAlgorithm(reason);
        TransformStreamDefaultControllerClearAlgorithms(controller);
        uponPromise(cancelPromise, () => {
          if (readable._state === "errored") {
            defaultControllerFinishPromiseReject(controller, readable._storedError);
          } else {
            ReadableStreamDefaultControllerError(readable._readableStreamController, reason);
            defaultControllerFinishPromiseResolve(controller);
          }
          return null;
        }, (r2) => {
          ReadableStreamDefaultControllerError(readable._readableStreamController, r2);
          defaultControllerFinishPromiseReject(controller, r2);
          return null;
        });
        return controller._finishPromise;
      }
      function TransformStreamDefaultSinkCloseAlgorithm(stream) {
        const controller = stream._transformStreamController;
        if (controller._finishPromise !== void 0) {
          return controller._finishPromise;
        }
        const readable = stream._readable;
        controller._finishPromise = newPromise((resolve, reject) => {
          controller._finishPromise_resolve = resolve;
          controller._finishPromise_reject = reject;
        });
        const flushPromise = controller._flushAlgorithm();
        TransformStreamDefaultControllerClearAlgorithms(controller);
        uponPromise(flushPromise, () => {
          if (readable._state === "errored") {
            defaultControllerFinishPromiseReject(controller, readable._storedError);
          } else {
            ReadableStreamDefaultControllerClose(readable._readableStreamController);
            defaultControllerFinishPromiseResolve(controller);
          }
          return null;
        }, (r2) => {
          ReadableStreamDefaultControllerError(readable._readableStreamController, r2);
          defaultControllerFinishPromiseReject(controller, r2);
          return null;
        });
        return controller._finishPromise;
      }
      function TransformStreamDefaultSourcePullAlgorithm(stream) {
        TransformStreamSetBackpressure(stream, false);
        return stream._backpressureChangePromise;
      }
      function TransformStreamDefaultSourceCancelAlgorithm(stream, reason) {
        const controller = stream._transformStreamController;
        if (controller._finishPromise !== void 0) {
          return controller._finishPromise;
        }
        const writable = stream._writable;
        controller._finishPromise = newPromise((resolve, reject) => {
          controller._finishPromise_resolve = resolve;
          controller._finishPromise_reject = reject;
        });
        const cancelPromise = controller._cancelAlgorithm(reason);
        TransformStreamDefaultControllerClearAlgorithms(controller);
        uponPromise(cancelPromise, () => {
          if (writable._state === "errored") {
            defaultControllerFinishPromiseReject(controller, writable._storedError);
          } else {
            WritableStreamDefaultControllerErrorIfNeeded(writable._writableStreamController, reason);
            TransformStreamUnblockWrite(stream);
            defaultControllerFinishPromiseResolve(controller);
          }
          return null;
        }, (r2) => {
          WritableStreamDefaultControllerErrorIfNeeded(writable._writableStreamController, r2);
          TransformStreamUnblockWrite(stream);
          defaultControllerFinishPromiseReject(controller, r2);
          return null;
        });
        return controller._finishPromise;
      }
      function defaultControllerBrandCheckException(name) {
        return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
      }
      function defaultControllerFinishPromiseResolve(controller) {
        if (controller._finishPromise_resolve === void 0) {
          return;
        }
        controller._finishPromise_resolve();
        controller._finishPromise_resolve = void 0;
        controller._finishPromise_reject = void 0;
      }
      function defaultControllerFinishPromiseReject(controller, reason) {
        if (controller._finishPromise_reject === void 0) {
          return;
        }
        setPromiseIsHandledToTrue(controller._finishPromise);
        controller._finishPromise_reject(reason);
        controller._finishPromise_resolve = void 0;
        controller._finishPromise_reject = void 0;
      }
      function streamBrandCheckException(name) {
        return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
      }
      exports3.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
      exports3.CountQueuingStrategy = CountQueuingStrategy;
      exports3.ReadableByteStreamController = ReadableByteStreamController;
      exports3.ReadableStream = ReadableStream2;
      exports3.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
      exports3.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
      exports3.ReadableStreamDefaultController = ReadableStreamDefaultController;
      exports3.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
      exports3.TransformStream = TransformStream;
      exports3.TransformStreamDefaultController = TransformStreamDefaultController;
      exports3.WritableStream = WritableStream;
      exports3.WritableStreamDefaultController = WritableStreamDefaultController;
      exports3.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
    }));
  }
});

// node_modules/fetch-blob/streams.cjs
var require_streams = __commonJS({
  "node_modules/fetch-blob/streams.cjs"() {
    var POOL_SIZE2 = 65536;
    if (!globalThis.ReadableStream) {
      try {
        const process2 = require("node:process");
        const { emitWarning } = process2;
        try {
          process2.emitWarning = () => {
          };
          Object.assign(globalThis, require("node:stream/web"));
          process2.emitWarning = emitWarning;
        } catch (error) {
          process2.emitWarning = emitWarning;
          throw error;
        }
      } catch (error) {
        Object.assign(globalThis, require_ponyfill_es2018());
      }
    }
    try {
      const { Blob: Blob3 } = require("buffer");
      if (Blob3 && !Blob3.prototype.stream) {
        Blob3.prototype.stream = function name(params) {
          let position = 0;
          const blob = this;
          return new ReadableStream({
            type: "bytes",
            async pull(ctrl) {
              const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE2));
              const buffer = await chunk.arrayBuffer();
              position += buffer.byteLength;
              ctrl.enqueue(new Uint8Array(buffer));
              if (position === blob.size) {
                ctrl.close();
              }
            }
          });
        };
      }
    } catch (error) {
    }
  }
});

// node_modules/fetch-blob/index.js
async function* toIterator(parts, clone2 = true) {
  for (const part of parts) {
    if ("stream" in part) {
      yield* (
        /** @type {AsyncIterableIterator<Uint8Array>} */
        part.stream()
      );
    } else if (ArrayBuffer.isView(part)) {
      if (clone2) {
        let position = part.byteOffset;
        const end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    } else {
      let position = 0, b = (
        /** @type {Blob} */
        part
      );
      while (position !== b.size) {
        const chunk = b.slice(position, Math.min(b.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}
var import_streams, POOL_SIZE, _Blob, Blob2, fetch_blob_default;
var init_fetch_blob = __esm({
  "node_modules/fetch-blob/index.js"() {
    import_streams = __toESM(require_streams(), 1);
    POOL_SIZE = 65536;
    _Blob = class Blob {
      /** @type {Array.<(Blob|Uint8Array)>} */
      #parts = [];
      #type = "";
      #size = 0;
      #endings = "transparent";
      /**
       * The Blob() constructor returns a new Blob object. The content
       * of the blob consists of the concatenation of the values given
       * in the parameter array.
       *
       * @param {*} blobParts
       * @param {{ type?: string, endings?: string }} [options]
       */
      constructor(blobParts = [], options = {}) {
        if (typeof blobParts !== "object" || blobParts === null) {
          throw new TypeError("Failed to construct 'Blob': The provided value cannot be converted to a sequence.");
        }
        if (typeof blobParts[Symbol.iterator] !== "function") {
          throw new TypeError("Failed to construct 'Blob': The object must have a callable @@iterator property.");
        }
        if (typeof options !== "object" && typeof options !== "function") {
          throw new TypeError("Failed to construct 'Blob': parameter 2 cannot convert to dictionary.");
        }
        if (options === null) options = {};
        const encoder = new TextEncoder();
        for (const element of blobParts) {
          let part;
          if (ArrayBuffer.isView(element)) {
            part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
          } else if (element instanceof ArrayBuffer) {
            part = new Uint8Array(element.slice(0));
          } else if (element instanceof Blob) {
            part = element;
          } else {
            part = encoder.encode(`${element}`);
          }
          this.#size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
          this.#parts.push(part);
        }
        this.#endings = `${options.endings === void 0 ? "transparent" : options.endings}`;
        const type = options.type === void 0 ? "" : String(options.type);
        this.#type = /^[\x20-\x7E]*$/.test(type) ? type : "";
      }
      /**
       * The Blob interface's size property returns the
       * size of the Blob in bytes.
       */
      get size() {
        return this.#size;
      }
      /**
       * The type property of a Blob object returns the MIME type of the file.
       */
      get type() {
        return this.#type;
      }
      /**
       * The text() method in the Blob interface returns a Promise
       * that resolves with a string containing the contents of
       * the blob, interpreted as UTF-8.
       *
       * @return {Promise<string>}
       */
      async text() {
        const decoder = new TextDecoder();
        let str = "";
        for await (const part of toIterator(this.#parts, false)) {
          str += decoder.decode(part, { stream: true });
        }
        str += decoder.decode();
        return str;
      }
      /**
       * The arrayBuffer() method in the Blob interface returns a
       * Promise that resolves with the contents of the blob as
       * binary data contained in an ArrayBuffer.
       *
       * @return {Promise<ArrayBuffer>}
       */
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of toIterator(this.#parts, false)) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        const it = toIterator(this.#parts, true);
        return new globalThis.ReadableStream({
          // @ts-ignore
          type: "bytes",
          async pull(ctrl) {
            const chunk = await it.next();
            chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
          },
          async cancel() {
            await it.return();
          }
        });
      }
      /**
       * The Blob interface's slice() method creates and returns a
       * new Blob object which contains data from a subset of the
       * blob on which it's called.
       *
       * @param {number} [start]
       * @param {number} [end]
       * @param {string} [type]
       */
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = this.#parts;
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          if (added >= span) {
            break;
          }
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            let chunk;
            if (ArrayBuffer.isView(part)) {
              chunk = part.subarray(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.byteLength;
            } else {
              chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.size;
            }
            relativeEnd -= size2;
            blobParts.push(chunk);
            relativeStart = 0;
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        blob.#size = span;
        blob.#parts = blobParts;
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(_Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    Blob2 = _Blob;
    fetch_blob_default = Blob2;
  }
});

// node_modules/fetch-blob/file.js
var _File, File2, file_default;
var init_file = __esm({
  "node_modules/fetch-blob/file.js"() {
    init_fetch_blob();
    _File = class File extends fetch_blob_default {
      #lastModified = 0;
      #name = "";
      /**
       * @param {*[]} fileBits
       * @param {string} fileName
       * @param {{lastModified?: number, type?: string}} options
       */
      // @ts-ignore
      constructor(fileBits, fileName, options = {}) {
        if (arguments.length < 2) {
          throw new TypeError(`Failed to construct 'File': 2 arguments required, but only ${arguments.length} present.`);
        }
        super(fileBits, options);
        if (options === null) options = {};
        const lastModified = options.lastModified === void 0 ? Date.now() : Number(options.lastModified);
        if (!Number.isNaN(lastModified)) {
          this.#lastModified = lastModified;
        }
        this.#name = String(fileName);
      }
      get name() {
        return this.#name;
      }
      get lastModified() {
        return this.#lastModified;
      }
      get [Symbol.toStringTag]() {
        return "File";
      }
      static [Symbol.hasInstance](object) {
        return !!object && object instanceof fetch_blob_default && /^(File)$/.test(object[Symbol.toStringTag]);
      }
    };
    File2 = _File;
    file_default = File2;
  }
});

// node_modules/formdata-polyfill/esm.min.js
function formDataToBlob(F2, B = fetch_blob_default) {
  var b = `${r()}${r()}`.replace(/\./g, "").slice(-28).padStart(32, "-"), c = [], p = `--${b}\r
Content-Disposition: form-data; name="`;
  F2.forEach((v, n) => typeof v == "string" ? c.push(p + e(n) + `"\r
\r
${v.replace(/\r(?!\n)|(?<!\r)\n/g, "\r\n")}\r
`) : c.push(p + e(n) + `"; filename="${e(v.name, 1)}"\r
Content-Type: ${v.type || "application/octet-stream"}\r
\r
`, v, "\r\n"));
  c.push(`--${b}--`);
  return new B(c, { type: "multipart/form-data; boundary=" + b });
}
var t, i, h, r, m, f, e, x, FormData;
var init_esm_min = __esm({
  "node_modules/formdata-polyfill/esm.min.js"() {
    init_fetch_blob();
    init_file();
    ({ toStringTag: t, iterator: i, hasInstance: h } = Symbol);
    r = Math.random;
    m = "append,set,get,getAll,delete,keys,values,entries,forEach,constructor".split(",");
    f = (a, b, c) => (a += "", /^(Blob|File)$/.test(b && b[t]) ? [(c = c !== void 0 ? c + "" : b[t] == "File" ? b.name : "blob", a), b.name !== c || b[t] == "blob" ? new file_default([b], c, b) : b] : [a, b + ""]);
    e = (c, f3) => (f3 ? c : c.replace(/\r?\n|\r/g, "\r\n")).replace(/\n/g, "%0A").replace(/\r/g, "%0D").replace(/"/g, "%22");
    x = (n, a, e2) => {
      if (a.length < e2) {
        throw new TypeError(`Failed to execute '${n}' on 'FormData': ${e2} arguments required, but only ${a.length} present.`);
      }
    };
    FormData = class FormData2 {
      #d = [];
      constructor(...a) {
        if (a.length) throw new TypeError(`Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'.`);
      }
      get [t]() {
        return "FormData";
      }
      [i]() {
        return this.entries();
      }
      static [h](o) {
        return o && typeof o === "object" && o[t] === "FormData" && !m.some((m2) => typeof o[m2] != "function");
      }
      append(...a) {
        x("append", arguments, 2);
        this.#d.push(f(...a));
      }
      delete(a) {
        x("delete", arguments, 1);
        a += "";
        this.#d = this.#d.filter(([b]) => b !== a);
      }
      get(a) {
        x("get", arguments, 1);
        a += "";
        for (var b = this.#d, l = b.length, c = 0; c < l; c++) if (b[c][0] === a) return b[c][1];
        return null;
      }
      getAll(a, b) {
        x("getAll", arguments, 1);
        b = [];
        a += "";
        this.#d.forEach((c) => c[0] === a && b.push(c[1]));
        return b;
      }
      has(a) {
        x("has", arguments, 1);
        a += "";
        return this.#d.some((b) => b[0] === a);
      }
      forEach(a, b) {
        x("forEach", arguments, 1);
        for (var [c, d] of this) a.call(b, d, c, this);
      }
      set(...a) {
        x("set", arguments, 2);
        var b = [], c = true;
        a = f(...a);
        this.#d.forEach((d) => {
          d[0] === a[0] ? c && (c = !b.push(a)) : b.push(d);
        });
        c && b.push(a);
        this.#d = b;
      }
      *entries() {
        yield* this.#d;
      }
      *keys() {
        for (var [a] of this) yield a;
      }
      *values() {
        for (var [, a] of this) yield a;
      }
    };
  }
});

// node_modules/node-domexception/index.js
var require_node_domexception = __commonJS({
  "node_modules/node-domexception/index.js"(exports2, module2) {
    if (!globalThis.DOMException) {
      try {
        const { MessageChannel } = require("worker_threads"), port = new MessageChannel().port1, ab = new ArrayBuffer();
        port.postMessage(ab, [ab, ab]);
      } catch (err) {
        err.constructor.name === "DOMException" && (globalThis.DOMException = err.constructor);
      }
    }
    module2.exports = globalThis.DOMException;
  }
});

// node_modules/fetch-blob/from.js
var import_node_fs, import_node_domexception, stat;
var init_from = __esm({
  "node_modules/fetch-blob/from.js"() {
    import_node_fs = require("node:fs");
    import_node_domexception = __toESM(require_node_domexception(), 1);
    init_file();
    init_fetch_blob();
    ({ stat } = import_node_fs.promises);
  }
});

// node_modules/node-fetch/src/utils/multipart-parser.js
var multipart_parser_exports = {};
__export(multipart_parser_exports, {
  toFormData: () => toFormData
});
function _fileName(headerValue) {
  const m2 = headerValue.match(/\bfilename=("(.*?)"|([^()<>@,;:\\"/[\]?={}\s\t]+))($|;\s)/i);
  if (!m2) {
    return;
  }
  const match = m2[2] || m2[3] || "";
  let filename = match.slice(match.lastIndexOf("\\") + 1);
  filename = filename.replace(/%22/g, '"');
  filename = filename.replace(/&#(\d{4});/g, (m3, code) => {
    return String.fromCharCode(code);
  });
  return filename;
}
async function toFormData(Body2, ct) {
  if (!/multipart/i.test(ct)) {
    throw new TypeError("Failed to fetch");
  }
  const m2 = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!m2) {
    throw new TypeError("no or bad content-type header, no multipart boundary");
  }
  const parser = new MultipartParser(m2[1] || m2[2]);
  let headerField;
  let headerValue;
  let entryValue;
  let entryName;
  let contentType;
  let filename;
  const entryChunks = [];
  const formData = new FormData();
  const onPartData = (ui8a) => {
    entryValue += decoder.decode(ui8a, { stream: true });
  };
  const appendToFile = (ui8a) => {
    entryChunks.push(ui8a);
  };
  const appendFileToFormData = () => {
    const file = new file_default(entryChunks, filename, { type: contentType });
    formData.append(entryName, file);
  };
  const appendEntryToFormData = () => {
    formData.append(entryName, entryValue);
  };
  const decoder = new TextDecoder("utf-8");
  decoder.decode();
  parser.onPartBegin = function() {
    parser.onPartData = onPartData;
    parser.onPartEnd = appendEntryToFormData;
    headerField = "";
    headerValue = "";
    entryValue = "";
    entryName = "";
    contentType = "";
    filename = null;
    entryChunks.length = 0;
  };
  parser.onHeaderField = function(ui8a) {
    headerField += decoder.decode(ui8a, { stream: true });
  };
  parser.onHeaderValue = function(ui8a) {
    headerValue += decoder.decode(ui8a, { stream: true });
  };
  parser.onHeaderEnd = function() {
    headerValue += decoder.decode();
    headerField = headerField.toLowerCase();
    if (headerField === "content-disposition") {
      const m3 = headerValue.match(/\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={}\s\t]+))/i);
      if (m3) {
        entryName = m3[2] || m3[3] || "";
      }
      filename = _fileName(headerValue);
      if (filename) {
        parser.onPartData = appendToFile;
        parser.onPartEnd = appendFileToFormData;
      }
    } else if (headerField === "content-type") {
      contentType = headerValue;
    }
    headerValue = "";
    headerField = "";
  };
  for await (const chunk of Body2) {
    parser.write(chunk);
  }
  parser.end();
  return formData;
}
var s, S, f2, F, LF, CR, SPACE, HYPHEN, COLON, A, Z, lower, noop, MultipartParser;
var init_multipart_parser = __esm({
  "node_modules/node-fetch/src/utils/multipart-parser.js"() {
    init_from();
    init_esm_min();
    s = 0;
    S = {
      START_BOUNDARY: s++,
      HEADER_FIELD_START: s++,
      HEADER_FIELD: s++,
      HEADER_VALUE_START: s++,
      HEADER_VALUE: s++,
      HEADER_VALUE_ALMOST_DONE: s++,
      HEADERS_ALMOST_DONE: s++,
      PART_DATA_START: s++,
      PART_DATA: s++,
      END: s++
    };
    f2 = 1;
    F = {
      PART_BOUNDARY: f2,
      LAST_BOUNDARY: f2 *= 2
    };
    LF = 10;
    CR = 13;
    SPACE = 32;
    HYPHEN = 45;
    COLON = 58;
    A = 97;
    Z = 122;
    lower = (c) => c | 32;
    noop = () => {
    };
    MultipartParser = class {
      /**
       * @param {string} boundary
       */
      constructor(boundary) {
        this.index = 0;
        this.flags = 0;
        this.onHeaderEnd = noop;
        this.onHeaderField = noop;
        this.onHeadersEnd = noop;
        this.onHeaderValue = noop;
        this.onPartBegin = noop;
        this.onPartData = noop;
        this.onPartEnd = noop;
        this.boundaryChars = {};
        boundary = "\r\n--" + boundary;
        const ui8a = new Uint8Array(boundary.length);
        for (let i2 = 0; i2 < boundary.length; i2++) {
          ui8a[i2] = boundary.charCodeAt(i2);
          this.boundaryChars[ui8a[i2]] = true;
        }
        this.boundary = ui8a;
        this.lookbehind = new Uint8Array(this.boundary.length + 8);
        this.state = S.START_BOUNDARY;
      }
      /**
       * @param {Uint8Array} data
       */
      write(data) {
        let i2 = 0;
        const length_ = data.length;
        let previousIndex = this.index;
        let { lookbehind, boundary, boundaryChars, index, state, flags } = this;
        const boundaryLength = this.boundary.length;
        const boundaryEnd = boundaryLength - 1;
        const bufferLength = data.length;
        let c;
        let cl;
        const mark = (name) => {
          this[name + "Mark"] = i2;
        };
        const clear = (name) => {
          delete this[name + "Mark"];
        };
        const callback = (callbackSymbol, start, end, ui8a) => {
          if (start === void 0 || start !== end) {
            this[callbackSymbol](ui8a && ui8a.subarray(start, end));
          }
        };
        const dataCallback = (name, clear2) => {
          const markSymbol = name + "Mark";
          if (!(markSymbol in this)) {
            return;
          }
          if (clear2) {
            callback(name, this[markSymbol], i2, data);
            delete this[markSymbol];
          } else {
            callback(name, this[markSymbol], data.length, data);
            this[markSymbol] = 0;
          }
        };
        for (i2 = 0; i2 < length_; i2++) {
          c = data[i2];
          switch (state) {
            case S.START_BOUNDARY:
              if (index === boundary.length - 2) {
                if (c === HYPHEN) {
                  flags |= F.LAST_BOUNDARY;
                } else if (c !== CR) {
                  return;
                }
                index++;
                break;
              } else if (index - 1 === boundary.length - 2) {
                if (flags & F.LAST_BOUNDARY && c === HYPHEN) {
                  state = S.END;
                  flags = 0;
                } else if (!(flags & F.LAST_BOUNDARY) && c === LF) {
                  index = 0;
                  callback("onPartBegin");
                  state = S.HEADER_FIELD_START;
                } else {
                  return;
                }
                break;
              }
              if (c !== boundary[index + 2]) {
                index = -2;
              }
              if (c === boundary[index + 2]) {
                index++;
              }
              break;
            case S.HEADER_FIELD_START:
              state = S.HEADER_FIELD;
              mark("onHeaderField");
              index = 0;
            // falls through
            case S.HEADER_FIELD:
              if (c === CR) {
                clear("onHeaderField");
                state = S.HEADERS_ALMOST_DONE;
                break;
              }
              index++;
              if (c === HYPHEN) {
                break;
              }
              if (c === COLON) {
                if (index === 1) {
                  return;
                }
                dataCallback("onHeaderField", true);
                state = S.HEADER_VALUE_START;
                break;
              }
              cl = lower(c);
              if (cl < A || cl > Z) {
                return;
              }
              break;
            case S.HEADER_VALUE_START:
              if (c === SPACE) {
                break;
              }
              mark("onHeaderValue");
              state = S.HEADER_VALUE;
            // falls through
            case S.HEADER_VALUE:
              if (c === CR) {
                dataCallback("onHeaderValue", true);
                callback("onHeaderEnd");
                state = S.HEADER_VALUE_ALMOST_DONE;
              }
              break;
            case S.HEADER_VALUE_ALMOST_DONE:
              if (c !== LF) {
                return;
              }
              state = S.HEADER_FIELD_START;
              break;
            case S.HEADERS_ALMOST_DONE:
              if (c !== LF) {
                return;
              }
              callback("onHeadersEnd");
              state = S.PART_DATA_START;
              break;
            case S.PART_DATA_START:
              state = S.PART_DATA;
              mark("onPartData");
            // falls through
            case S.PART_DATA:
              previousIndex = index;
              if (index === 0) {
                i2 += boundaryEnd;
                while (i2 < bufferLength && !(data[i2] in boundaryChars)) {
                  i2 += boundaryLength;
                }
                i2 -= boundaryEnd;
                c = data[i2];
              }
              if (index < boundary.length) {
                if (boundary[index] === c) {
                  if (index === 0) {
                    dataCallback("onPartData", true);
                  }
                  index++;
                } else {
                  index = 0;
                }
              } else if (index === boundary.length) {
                index++;
                if (c === CR) {
                  flags |= F.PART_BOUNDARY;
                } else if (c === HYPHEN) {
                  flags |= F.LAST_BOUNDARY;
                } else {
                  index = 0;
                }
              } else if (index - 1 === boundary.length) {
                if (flags & F.PART_BOUNDARY) {
                  index = 0;
                  if (c === LF) {
                    flags &= ~F.PART_BOUNDARY;
                    callback("onPartEnd");
                    callback("onPartBegin");
                    state = S.HEADER_FIELD_START;
                    break;
                  }
                } else if (flags & F.LAST_BOUNDARY) {
                  if (c === HYPHEN) {
                    callback("onPartEnd");
                    state = S.END;
                    flags = 0;
                  } else {
                    index = 0;
                  }
                } else {
                  index = 0;
                }
              }
              if (index > 0) {
                lookbehind[index - 1] = c;
              } else if (previousIndex > 0) {
                const _lookbehind = new Uint8Array(lookbehind.buffer, lookbehind.byteOffset, lookbehind.byteLength);
                callback("onPartData", 0, previousIndex, _lookbehind);
                previousIndex = 0;
                mark("onPartData");
                i2--;
              }
              break;
            case S.END:
              break;
            default:
              throw new Error(`Unexpected state entered: ${state}`);
          }
        }
        dataCallback("onHeaderField");
        dataCallback("onHeaderValue");
        dataCallback("onPartData");
        this.index = index;
        this.state = state;
        this.flags = flags;
      }
      end() {
        if (this.state === S.HEADER_FIELD_START && this.index === 0 || this.state === S.PART_DATA && this.index === this.boundary.length) {
          this.onPartEnd();
        } else if (this.state !== S.END) {
          throw new Error("MultipartParser.end(): stream ended unexpectedly");
        }
      }
    };
  }
});

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);

// node_modules/dotenv/config.js
(function() {
  require_main().config(
    Object.assign(
      {},
      require_env_options(),
      require_cli_options()(process.argv)
    )
  );
})();

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);

// src/server/mysqlService.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);

// src/server/authService.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);

// src/server/mailService.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
function generateId() {
  if (typeof import_crypto.default.randomUUID === "function") {
    return import_crypto.default.randomUUID();
  }
  return "acc-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now();
}
var SETTINGS_FILE = import_path.default.resolve(process.cwd(), "mail-config.json");
var transporterCache = /* @__PURE__ */ new Map();
var currentMailConfig = {
  service: "gmail",
  accounts: []
};
function maskEmail(email) {
  if (!email) return "";
  return email.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => `${a}${"*".repeat(Math.max(2, b.length))}${c}`);
}
function loadMailConfig() {
  try {
    if (import_fs.default.existsSync(SETTINGS_FILE)) {
      const data = import_fs.default.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.gmailUser && (!parsed.accounts || !Array.isArray(parsed.accounts))) {
        const legacyAcc = {
          id: generateId(),
          name: "Gmail Utama",
          gmailUser: parsed.gmailUser || "",
          gmailAppPassword: parsed.gmailAppPassword || "",
          fromName: parsed.fromName || "DataForge API Studio",
          host: parsed.host || "smtp.gmail.com",
          port: parsed.port || 465,
          secure: parsed.secure ?? true,
          isActive: true,
          order: 1,
          successCount: 0,
          failCount: 0
        };
        currentMailConfig = {
          service: "gmail",
          accounts: [legacyAcc]
        };
        saveMailConfig(currentMailConfig);
      } else if (Array.isArray(parsed.accounts)) {
        currentMailConfig = {
          service: "gmail",
          accounts: parsed.accounts
        };
      }
    }
  } catch (err) {
    console.warn("[MailService] Gagal membaca mail-config.json:", err);
  }
  return currentMailConfig;
}
function saveMailConfig(cfg) {
  currentMailConfig = cfg;
  try {
    import_fs.default.writeFileSync(SETTINGS_FILE, JSON.stringify(currentMailConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("[MailService] Gagal menyimpan mail-config.json:", err);
  }
  if (isMySQLConnected()) {
    syncAllSmtpAccountsToMySQL(currentMailConfig.accounts).catch((err) => {
      console.error("[MailService] Gagal sinkronisasi SMTP ke MySQL:", err);
    });
  }
  return currentMailConfig;
}
async function syncMailConfigWithMySQL() {
  if (!isMySQLConnected()) return;
  try {
    const mysqlAccounts = await loadSmtpAccountsFromMySQL();
    if (mysqlAccounts.length > 0) {
      currentMailConfig = {
        service: "gmail",
        accounts: mysqlAccounts
      };
      try {
        import_fs.default.writeFileSync(SETTINGS_FILE, JSON.stringify(currentMailConfig, null, 2), "utf-8");
      } catch (_) {
      }
      console.log(`[MailService] Berhasil memuat & sinkronkan ${mysqlAccounts.length} akun SMTP dari database online MySQL.`);
    } else {
      const localCfg = loadMailConfig();
      if (localCfg.accounts.length > 0) {
        await syncAllSmtpAccountsToMySQL(localCfg.accounts);
        console.log(`[MailService] Berhasil mengunggah ${localCfg.accounts.length} akun SMTP lokal ke tabel df_smtp_accounts MySQL.`);
      }
    }
  } catch (err) {
    console.error("[MailService] Gagal sinkronisasi SMTP dengan MySQL:", err);
  }
}
function getSafeMailConfig() {
  const cfg = loadMailConfig();
  const safeAccounts = cfg.accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    gmailUser: acc.gmailUser,
    fromName: acc.fromName,
    host: acc.host,
    port: acc.port,
    secure: acc.secure,
    isActive: acc.isActive,
    order: acc.order,
    hasPassword: Boolean(acc.gmailAppPassword && acc.gmailAppPassword.trim().length > 0),
    maskedUser: maskEmail(acc.gmailUser),
    lastTestedAt: acc.lastTestedAt,
    lastStatus: acc.lastStatus || "untested",
    lastErrorMessage: acc.lastErrorMessage,
    successCount: acc.successCount || 0,
    failCount: acc.failCount || 0
  }));
  safeAccounts.sort((a, b) => a.order - b.order);
  return {
    service: "gmail",
    storageFile: "mail-config.json",
    storageTable: "df_smtp_accounts",
    isMySQLSynced: isMySQLConnected(),
    accounts: safeAccounts
  };
}
function getTransporterForAccount(acc) {
  if (!acc.gmailUser || !acc.gmailAppPassword) {
    return null;
  }
  const cleanPassword = acc.gmailAppPassword.replace(/\s+/g, "");
  const cacheKey = `${acc.id}:${acc.gmailUser}:${cleanPassword}:${acc.host}:${acc.port}:${acc.secure}`;
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey);
  }
  const transporter = import_nodemailer.default.createTransport({
    service: "gmail",
    host: acc.host || "smtp.gmail.com",
    port: acc.port || 465,
    secure: acc.secure ?? true,
    auth: {
      user: acc.gmailUser,
      pass: cleanPassword
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 1e4,
    greetingTimeout: 1e4,
    socketTimeout: 15e3
  });
  transporterCache.set(cacheKey, transporter);
  return transporter;
}
function invalidateTransporterCache(accountId) {
  if (accountId) {
    for (const key of transporterCache.keys()) {
      if (key.startsWith(accountId)) {
        transporterCache.delete(key);
      }
    }
  } else {
    transporterCache.clear();
  }
}
function addSmtpAccount(data) {
  const cfg = loadMailConfig();
  const nextOrder = cfg.accounts.length > 0 ? Math.max(...cfg.accounts.map((a) => a.order)) + 1 : 1;
  const newAccount = {
    id: generateId(),
    name: data.name || `Gmail Akun ${nextOrder}`,
    gmailUser: data.gmailUser.trim().toLowerCase(),
    gmailAppPassword: data.gmailAppPassword.trim(),
    fromName: data.fromName || "DataForge API Studio",
    host: data.host || "smtp.gmail.com",
    port: data.port || 465,
    secure: data.secure ?? true,
    isActive: data.isActive ?? true,
    order: nextOrder,
    successCount: 0,
    failCount: 0,
    lastStatus: "untested"
  };
  cfg.accounts.push(newAccount);
  saveMailConfig(cfg);
  mysqlUpsertSmtpAccount(newAccount);
  return newAccount;
}
function updateSmtpAccount(id, data) {
  const cfg = loadMailConfig();
  const idx = cfg.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const current = cfg.accounts[idx];
  const updated = {
    ...current,
    ...data,
    gmailUser: data.gmailUser !== void 0 ? data.gmailUser.trim().toLowerCase() : current.gmailUser,
    gmailAppPassword: data.gmailAppPassword !== void 0 && data.gmailAppPassword.trim() !== "" ? data.gmailAppPassword.trim() : current.gmailAppPassword
  };
  cfg.accounts[idx] = updated;
  invalidateTransporterCache(id);
  saveMailConfig(cfg);
  mysqlUpsertSmtpAccount(updated);
  return updated;
}
function deleteSmtpAccount(id) {
  const cfg = loadMailConfig();
  const beforeCount = cfg.accounts.length;
  cfg.accounts = cfg.accounts.filter((a) => a.id !== id);
  if (cfg.accounts.length < beforeCount) {
    cfg.accounts.forEach((acc, i2) => {
      acc.order = i2 + 1;
    });
    invalidateTransporterCache(id);
    saveMailConfig(cfg);
    mysqlDeleteSmtpAccount(id);
    return true;
  }
  return false;
}
function reorderSmtpAccounts(ids) {
  const cfg = loadMailConfig();
  const newAccounts = [];
  ids.forEach((id, index) => {
    const acc = cfg.accounts.find((a) => a.id === id);
    if (acc) {
      acc.order = index + 1;
      newAccounts.push(acc);
    }
  });
  cfg.accounts.forEach((acc) => {
    if (!newAccounts.some((a) => a.id === acc.id)) {
      acc.order = newAccounts.length + 1;
      newAccounts.push(acc);
    }
  });
  cfg.accounts = newAccounts;
  saveMailConfig(cfg);
  syncAllSmtpAccountsToMySQL(newAccounts);
  return true;
}
async function testSingleSmtpAccount(accountId, testEmail) {
  const cfg = loadMailConfig();
  const acc = cfg.accounts.find((a) => a.id === accountId);
  if (!acc) {
    return { success: false, message: "Akun SMTP tidak ditemukan.", accountName: "" };
  }
  if (!acc.gmailUser || !acc.gmailAppPassword) {
    return {
      success: false,
      message: "Kredensial Gmail akun ini belum lengkap (Email & App Password 16-karakter diperlukan).",
      accountName: acc.name
    };
  }
  const transporter = getTransporterForAccount(acc);
  if (!transporter) {
    return { success: false, message: "Gagal membuat koneksi SMTP transporter.", accountName: acc.name };
  }
  try {
    await transporter.verify();
    if (testEmail) {
      await transporter.sendMail({
        from: `"${acc.fromName || "DataForge API Studio"}" <${acc.gmailUser}>`,
        to: testEmail,
        subject: `[Uji Coba ${acc.name}] Verifikasi SMTP Server DataForge`,
        text: `Halo,

Ini adalah email uji coba dari akun ${acc.name} (${acc.gmailUser}).
Koneksi Gmail SMTP akun ini berfungsi normal!

Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0;">DataForge API Studio</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Uji Coba Failover Pool SMTP</p>
            </div>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
              <h4 style="color: #065f46; margin: 0 0 4px 0; font-size: 14px;">Koneksi Berhasil: ${acc.name}</h4>
              <p style="color: #047857; margin: 0; font-size: 12px;">Akun ${acc.gmailUser} siap mengirimkan email verifikasi.</p>
            </div>
            <p style="color: #475569; font-size: 12px;">Waktu: <strong>${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}</strong></p>
          </div>
        `
      });
    }
    acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
    acc.lastStatus = "success";
    acc.lastErrorMessage = void 0;
    acc.successCount = (acc.successCount || 0) + 1;
    saveMailConfig(cfg);
    mysqlUpsertSmtpAccount(acc);
    return {
      success: true,
      accountName: acc.name,
      message: `Akun "${acc.name}" (${acc.gmailUser}) sukses terverifikasi ${testEmail ? `dan email uji coba terkirim ke ${testEmail}` : ""}!`
    };
  } catch (err) {
    acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
    acc.lastStatus = "failed";
    acc.lastErrorMessage = err.message;
    acc.failCount = (acc.failCount || 0) + 1;
    saveMailConfig(cfg);
    mysqlUpsertSmtpAccount(acc);
    return {
      success: false,
      accountName: acc.name,
      message: `Gagal verifikasi "${acc.name}": ${err.message}`,
      error: err.message
    };
  }
}
async function sendEmailWithFailover(options) {
  const cfg = loadMailConfig();
  const activeAccounts = cfg.accounts.filter((a) => a.isActive && a.gmailUser && a.gmailAppPassword).sort((a, b) => a.order - b.order);
  const attempts = [];
  if (activeAccounts.length === 0) {
    console.log(`[MailService Failover] Tidak ada akun Gmail SMTP aktif. Mode simulasi untuk: ${options.toEmail}`);
    return { sent: false, simulated: true, attempts };
  }
  for (const acc of activeAccounts) {
    try {
      console.log(`[MailService Failover] Mencoba kirim via akun: "${acc.name}" (${acc.gmailUser})...`);
      const transporter = getTransporterForAccount(acc);
      if (!transporter) {
        throw new Error("Transporter tidak dapat diinisialisasi");
      }
      await transporter.sendMail({
        from: `"${acc.fromName || "DataForge API Studio"}" <${acc.gmailUser}>`,
        to: options.toEmail,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
      acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      acc.lastStatus = "success";
      acc.lastErrorMessage = void 0;
      acc.successCount = (acc.successCount || 0) + 1;
      saveMailConfig(cfg);
      mysqlUpsertSmtpAccount(acc);
      console.log(`[MailService Failover] Berhasil kirim email ke ${options.toEmail} menggunakan akun: "${acc.name}"`);
      attempts.push({ accountName: acc.name, success: true });
      return {
        sent: true,
        simulated: false,
        accountUsed: `${acc.name} (${acc.gmailUser})`,
        attempts
      };
    } catch (err) {
      console.warn(`[MailService Failover] Akun "${acc.name}" (${acc.gmailUser}) gagal kirim: ${err.message}. Beralih ke akun berikutnya...`);
      acc.lastTestedAt = (/* @__PURE__ */ new Date()).toISOString();
      acc.lastStatus = "failed";
      acc.lastErrorMessage = err.message;
      acc.failCount = (acc.failCount || 0) + 1;
      mysqlUpsertSmtpAccount(acc);
      attempts.push({ accountName: acc.name, success: false, error: err.message });
    }
  }
  saveMailConfig(cfg);
  console.error(`[MailService Failover] Seluruh ${activeAccounts.length} akun Gmail SMTP gagal mengirim email.`);
  return {
    sent: false,
    simulated: true,
    attempts
  };
}
async function sendVerificationEmail(toEmail, toName, code, token, appUrl) {
  const verifyLink = `${appUrl || "http://localhost:3000"}?verify_token=${token}`;
  const subject = `${code} adalah Kode Verifikasi Akun DataForge API Studio Anda`;
  const text = `Halo ${toName},

Terima kasih telah mendaftar di DataForge API Studio.

Kode Verifikasi Anda adalah:
${code}

Atau buka tautan verifikasi berikut:
${verifyLink}

Kode ini berlaku selama 24 jam.

Salam,
Tim DataForge`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #4f46e5, #10b981); border-radius: 12px; line-height: 48px; color: #ffffff; font-weight: bold; font-size: 20px;">
            DF
          </div>
          <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 700;">Verifikasi Email Anda</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Satu langkah lagi untuk mengaktifkan akun DataForge API Studio Anda</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Halo <strong>${toName}</strong>,<br />
          Terima kasih telah bergabung. Gunakan kode verifikasi di bawah ini untuk memverifikasi akun Anda:
        </p>

        <div style="text-align: center; margin: 28px 0; padding: 20px; background-color: #f1f5f9; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;">
            ${code}
          </span>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Berlaku selama 24 jam</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${verifyLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
            Verifikasi Otomatis (1-Klik)
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
          Jika Anda tidak merasa mendaftar di DataForge API Studio, Anda dapat mengabaikan email ini dengan aman.
        </p>
      </div>
    </div>
  `;
  const result = await sendEmailWithFailover({ toEmail, subject, text, html });
  if (result.simulated) {
    console.log(`[MailService] Kode OTP untuk ${toEmail}: [${code}] (Token: ${token})`);
  }
  return {
    sent: result.sent,
    simulated: result.simulated,
    accountUsed: result.accountUsed,
    error: !result.sent ? "Semua akun SMTP gagal atau belum aktif" : void 0
  };
}
async function sendPasswordResetEmail(toEmail, toName, code, token, appUrl) {
  const resetLink = `${appUrl || "http://localhost:3000"}?reset_token=${token}&email=${encodeURIComponent(toEmail)}`;
  const subject = `[${code}] Permintaan Reset Kata Sandi DataForge API Studio`;
  const text = `Halo ${toName},

Kami menerima permintaan untuk mengatur ulang kata sandi akun DataForge Anda.

Kode Reset Kata Sandi Anda adalah:
${code}

Atau gunakan tautan reset langsung:
${resetLink}

Kode ini berlaku selama 30 menit. Jika Anda tidak meminta reset kata sandi, abaikan pesan ini.

Salam,
Tim DataForge`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #f8fafc; border-radius: 16px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 12px; line-height: 48px; color: #ffffff; font-weight: bold; font-size: 20px;">
            \u{1F511}
          </div>
          <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 700;">Atur Ulang Kata Sandi</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Permintaan pemulihan akses akun DataForge API Studio</p>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Halo <strong>${toName}</strong>,<br />
          Kami menerima permintaan untuk mereset kata sandi akun Anda. Gunakan kode 6-digit berikut atau klik tombol di bawah untuk memasukkan kata sandi baru:
        </p>

        <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #fffbeb; border-radius: 12px; border: 1px dashed #fcd34d;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #d97706;">
            ${code}
          </span>
          <p style="color: #92400e; font-size: 12px; margin: 8px 0 0 0;">Berlaku selama 30 menit</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 600; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
            Atur Ulang Sandi Sekarang
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
          Jika Anda tidak meminta perubahan kata sandi ini, akun Anda tetap aman dan Anda dapat mengabaikan email ini.
        </p>
      </div>
    </div>
  `;
  const result = await sendEmailWithFailover({ toEmail, subject, text, html });
  if (result.simulated) {
    console.log(`[MailService] Kode Reset Sandi untuk ${toEmail}: [${code}] (Token: ${token})`);
  }
  return {
    sent: result.sent,
    simulated: result.simulated,
    accountUsed: result.accountUsed,
    error: !result.sent ? "Semua akun SMTP gagal atau belum aktif" : void 0
  };
}

// src/server/authService.ts
var JWT_SECRET = process.env.JWT_SECRET || "dataforge_jwt_secret_dev_2026_xyz";
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
var users = [];
var DEFAULT_PASSWORD_HASH = import_bcryptjs.default.hashSync("123456", 10);
var SEED_USERS = [
  {
    id: "usr-superadmin",
    name: "Super Administrator",
    email: "superadmin@dataforge.io",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "superadmin",
    isVerified: true,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00Z")).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "usr-admin",
    name: "Administrator Data",
    email: "admin@dataforge.io",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "admin",
    isVerified: true,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00Z")).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "usr-user",
    name: "Pengguna Biasa",
    email: "user@dataforge.io",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "user",
    isVerified: true,
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00Z")).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function toSafeUser(user) {
  const {
    passwordHash,
    verificationCode,
    verificationToken,
    resetPasswordCode,
    resetPasswordToken,
    ...safe
  } = user;
  return safe;
}
function generateJwtToken(user) {
  return import_jsonwebtoken.default.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
function verifyJwtToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
function getAllUsers() {
  if (users.length === 0) {
    users = [...SEED_USERS];
  }
  return users;
}
function setAllUsers(loadedUsers) {
  if (!loadedUsers || loadedUsers.length === 0) {
    users = [...SEED_USERS];
  } else {
    const hasSuper = loadedUsers.some((u) => u.role === "superadmin");
    if (!hasSuper) {
      users = [SEED_USERS[0], ...loadedUsers];
    } else {
      users = [...loadedUsers];
    }
  }
}
async function registerUser(name, email, password, appUrl = "http://localhost:3000") {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  if (!cleanName) return { success: false, message: "Nama lengkap wajib diisi." };
  if (!cleanEmail || !cleanEmail.includes("@")) return { success: false, message: "Format alamat email tidak valid." };
  if (!password || password.length < 6) return { success: false, message: "Password minimal 6 karakter." };
  const all = getAllUsers();
  const existing = all.find((u) => u.email === cleanEmail);
  if (existing) {
    if (existing.isVerified) {
      return {
        success: false,
        message: "Alamat email ini sudah terdaftar dan aktif. Silakan masuk menggunakan password Anda."
      };
    }
    if (existing.lastOtpSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(existing.lastOtpSentAt).getTime()) / 1e3);
      if (elapsedSeconds < 60) {
        return {
          success: false,
          cooldownRemaining: 60 - elapsedSeconds,
          message: `Email belum diverifikasi. Mohon tunggu ${60 - elapsedSeconds} detik sebelum meminta kode OTP baru.`
        };
      }
    }
    const code2 = Math.floor(1e5 + Math.random() * 9e5).toString();
    const token2 = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    existing.name = cleanName;
    existing.passwordHash = await import_bcryptjs.default.hash(password, 10);
    existing.verificationCode = code2;
    existing.verificationToken = token2;
    existing.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    existing.lastOtpSentAt = (/* @__PURE__ */ new Date()).toISOString();
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const mailResult2 = await sendVerificationEmail(cleanEmail, cleanName, code2, token2, appUrl);
    return {
      success: true,
      user: toSafeUser(existing),
      verificationRequired: true,
      simulatedCode: mailResult2.simulated ? code2 : void 0,
      message: mailResult2.sent ? `Kode verifikasi telah dikirimkan ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.` : `Pendaftaran berhasil. Silakan masukkan kode verifikasi 6 digit untuk mengaktifkan akun Anda.`
    };
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
  const passwordHash = await import_bcryptjs.default.hash(password, 10);
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: "user",
    // Default role for public registration
    isVerified: false,
    verificationCode: code,
    verificationToken: token,
    verificationExpiresAt: expiresAt,
    lastOtpSentAt: nowStr,
    isActive: true,
    createdAt: nowStr,
    updatedAt: nowStr
  };
  users.push(newUser);
  const mailResult = await sendVerificationEmail(cleanEmail, cleanName, code, token, appUrl);
  return {
    success: true,
    user: toSafeUser(newUser),
    verificationRequired: true,
    simulatedCode: mailResult.simulated ? code : void 0,
    message: mailResult.sent ? `Kode verifikasi telah dikirim ke ${cleanEmail}. Periksa kotak masuk atau spam email Anda.` : `Pendaftaran berhasil. Silakan masukkan kode verifikasi 6-digit untuk mengaktifkan akun.`
  };
}
async function verifyUserEmail(identifier) {
  const all = getAllUsers();
  let user;
  if (identifier.token) {
    user = all.find((u) => u.verificationToken === identifier.token);
  } else if (identifier.email && identifier.code) {
    const cleanEmail = identifier.email.trim().toLowerCase();
    const cleanCode = identifier.code.trim();
    user = all.find((u) => u.email === cleanEmail && u.verificationCode === cleanCode);
  }
  if (!user) {
    return { success: false, message: "Kode verifikasi salah atau sudah kadaluarsa." };
  }
  user.isVerified = true;
  user.verificationCode = void 0;
  user.verificationToken = void 0;
  user.verificationExpiresAt = void 0;
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const token = generateJwtToken(user);
  return {
    success: true,
    user: toSafeUser(user),
    jwtToken: token,
    message: "Email berhasil diverifikasi! Akun Anda kini aktif."
  };
}
async function resendVerificationCode(email, appUrl = "http://localhost:3000") {
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllUsers();
  const user = all.find((u) => u.email === cleanEmail);
  if (!user) {
    return { success: false, message: "Akun dengan alamat email ini tidak ditemukan." };
  }
  if (user.isVerified) {
    return { success: false, message: "Akun ini sudah terverifikasi sebelumnya. Silakan langsung login." };
  }
  if (user.lastOtpSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastOtpSentAt).getTime()) / 1e3);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        message: `Mohon tunggu ${waitSeconds} detik lagi sebelum meminta pengiriman ulang kode OTP.`
      };
    }
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const token = `vtok_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  user.verificationCode = code;
  user.verificationToken = token;
  user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  user.lastOtpSentAt = (/* @__PURE__ */ new Date()).toISOString();
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const mailResult = await sendVerificationEmail(user.email, user.name, code, token, appUrl);
  return {
    success: true,
    simulatedCode: mailResult.simulated ? code : void 0,
    message: mailResult.sent ? `Kode verifikasi baru berhasil dikirim ke ${cleanEmail}.` : `Kode verifikasi baru berhasil dibuat: ${code}`
  };
}
async function updateUserProfile(userId, name, oldPassword, newPassword) {
  const all = getAllUsers();
  const user = all.find((u) => u.id === userId);
  if (!user) {
    return { success: false, message: "Pengguna tidak ditemukan." };
  }
  if (name && name.trim()) {
    user.name = name.trim();
  }
  if (newPassword) {
    if (!oldPassword) {
      return { success: false, message: "Kata sandi saat ini wajib diisi untuk mengubah sandi baru." };
    }
    const match = await import_bcryptjs.default.compare(oldPassword, user.passwordHash);
    if (!match) {
      return { success: false, message: "Kata sandi saat ini tidak sesuai." };
    }
    if (newPassword.length < 6) {
      return { success: false, message: "Kata sandi baru minimal 6 karakter." };
    }
    user.passwordHash = await import_bcryptjs.default.hash(newPassword, 10);
  }
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return {
    success: true,
    user: toSafeUser(user),
    message: "Profil akun berhasil diperbarui."
  };
}
async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  let user;
  if (isMySQLConnected()) {
    try {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser) {
        user = mysqlUser;
        const all = getAllUsers();
        const idx = all.findIndex((u) => u.id === mysqlUser.id || u.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          all[idx] = mysqlUser;
        } else {
          all.push(mysqlUser);
        }
      }
    } catch (err) {
      console.warn("[AuthService] Gagal membaca user langsung dari MySQL:", err);
    }
  }
  if (!user) {
    const all = getAllUsers();
    user = all.find((u) => u.email === cleanEmail);
  }
  if (!user) {
    return { success: false, message: "Email atau kata sandi yang Anda masukkan salah." };
  }
  const match = await import_bcryptjs.default.compare(password, user.passwordHash);
  if (!match) {
    return { success: false, message: "Email atau kata sandi yang Anda masukkan salah." };
  }
  if (!user.isActive) {
    return { success: false, message: "Akun Anda dinonaktifkan oleh administrator. Hubungi pengelola sistem." };
  }
  if (!user.isVerified) {
    return {
      success: false,
      unverified: true,
      email: user.email,
      message: "Email Anda belum diverifikasi. Masukkan kode 6 digit verifikasi Anda."
    };
  }
  const jwtToken = generateJwtToken(user);
  return {
    success: true,
    user: toSafeUser(user),
    jwtToken,
    message: `Selamat datang kembali, ${user.name}!`
  };
}
async function requestPasswordReset(email, appUrl = "http://localhost:3000") {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, message: "Silakan masukkan alamat email yang valid." };
  }
  let user;
  if (isMySQLConnected()) {
    try {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser) user = mysqlUser;
    } catch (_) {
    }
  }
  if (!user) {
    const all2 = getAllUsers();
    user = all2.find((u) => u.email === cleanEmail);
  }
  if (!user) {
    return {
      success: false,
      message: "Akun dengan alamat email tersebut tidak ditemukan dalam sistem."
    };
  }
  if (!user.isActive) {
    return {
      success: false,
      message: "Akun Anda dinonaktifkan oleh administrator. Silakan hubungi pengelola sistem."
    };
  }
  if (user.lastResetSentAt) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastResetSentAt).getTime()) / 1e3);
    if (elapsedSeconds < 60) {
      const waitSeconds = 60 - elapsedSeconds;
      return {
        success: false,
        cooldownRemaining: waitSeconds,
        message: `Mohon tunggu ${waitSeconds} detik sebelum meminta pengiriman ulang kode reset sandi.`
      };
    }
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const token = `rst_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
  const nowStr = (/* @__PURE__ */ new Date()).toISOString();
  user.resetPasswordCode = code;
  user.resetPasswordToken = token;
  user.resetPasswordExpiresAt = expiresAt;
  user.lastResetSentAt = nowStr;
  user.updatedAt = nowStr;
  const all = getAllUsers();
  const idx = all.findIndex((u) => u.id === user.id || u.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    all[idx] = user;
  } else {
    all.push(user);
  }
  if (isMySQLConnected()) {
    await mysqlUpsertUser(user);
  }
  const mailResult = await sendPasswordResetEmail(user.email, user.name, code, token, appUrl);
  return {
    success: true,
    simulatedCode: mailResult.simulated ? code : void 0,
    message: mailResult.sent ? `Kode verifikasi reset kata sandi telah dikirim ke ${user.email}. Periksa kotak masuk atau folder spam Anda.` : `Kode verifikasi reset kata sandi berhasil dibuat: ${code}`
  };
}
async function resetPasswordWithCodeOrToken(options) {
  const { email, code, token, newPassword } = options;
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: "Kata sandi baru minimal 6 karakter." };
  }
  if (isMySQLConnected()) {
    try {
      const mysqlUsers = await loadUsersFromMySQL();
      if (mysqlUsers.length > 0) {
        setAllUsers(mysqlUsers);
      }
    } catch (err) {
      console.warn("[AuthService] Gagal load users dari MySQL:", err);
    }
  }
  const refreshedAll = getAllUsers();
  let user;
  if (token) {
    user = refreshedAll.find((u) => u.resetPasswordToken === token);
  } else if (email && code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    user = refreshedAll.find((u) => u.email.trim().toLowerCase() === cleanEmail && String(u.resetPasswordCode || "").trim() === cleanCode);
    if (!user && isMySQLConnected()) {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser && String(mysqlUser.resetPasswordCode || "").trim() === cleanCode) {
        user = mysqlUser;
      }
    }
  }
  if (!user) {
    return { success: false, message: "Kode OTP atau tautan reset sandi tidak valid atau telah kedaluwarsa." };
  }
  if (user.resetPasswordExpiresAt) {
    const expiresAt = new Date(user.resetPasswordExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { success: false, message: "Kode verifikasi reset kata sandi telah kedaluwarsa. Silakan minta kode baru." };
    }
  }
  user.passwordHash = await import_bcryptjs.default.hash(newPassword, 10);
  user.resetPasswordCode = void 0;
  user.resetPasswordToken = void 0;
  user.resetPasswordExpiresAt = void 0;
  user.isVerified = true;
  user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (isMySQLConnected()) {
    await mysqlUpsertUser(user);
  }
  const jwtToken = generateJwtToken(user);
  return {
    success: true,
    user: toSafeUser(user),
    jwtToken,
    message: "Kata sandi berhasil diatur ulang! Anda telah otomatis masuk ke sistem."
  };
}
async function verifyResetCode(options) {
  const { email, code, token } = options;
  if (isMySQLConnected()) {
    try {
      const mysqlUsers = await loadUsersFromMySQL();
      if (mysqlUsers.length > 0) {
        setAllUsers(mysqlUsers);
      }
    } catch (err) {
      console.warn("[AuthService] Gagal load users dari MySQL:", err);
    }
  }
  const refreshedAll = getAllUsers();
  let user;
  if (token) {
    user = refreshedAll.find((u) => u.resetPasswordToken === token);
  } else if (email && code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    user = refreshedAll.find((u) => u.email.trim().toLowerCase() === cleanEmail && String(u.resetPasswordCode || "").trim() === cleanCode);
    if (!user && isMySQLConnected()) {
      const mysqlUser = await findUserByEmailFromMySQL(cleanEmail);
      if (mysqlUser && String(mysqlUser.resetPasswordCode || "").trim() === cleanCode) {
        user = mysqlUser;
      }
    }
  }
  if (!user) {
    return { success: false, message: "Kode OTP reset kata sandi tidak valid." };
  }
  if (user.resetPasswordExpiresAt) {
    const expiresAt = new Date(user.resetPasswordExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      return { success: false, message: "Kode verifikasi reset kata sandi telah kedaluwarsa. Silakan minta kode baru." };
    }
  }
  return { success: true, message: "Kode OTP valid. Silakan masukkan kata sandi baru." };
}

// node_modules/node-fetch/src/index.js
var import_node_http2 = __toESM(require("node:http"), 1);
var import_node_https = __toESM(require("node:https"), 1);
var import_node_zlib = __toESM(require("node:zlib"), 1);
var import_node_stream2 = __toESM(require("node:stream"), 1);
var import_node_buffer2 = require("node:buffer");

// node_modules/data-uri-to-buffer/dist/index.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i2 = 1; i2 < meta.length; i2++) {
    if (meta[i2] === "base64") {
      base64 = true;
    } else if (meta[i2]) {
      typeFull += `;${meta[i2]}`;
      if (meta[i2].indexOf("charset=") === 0) {
        charset = meta[i2].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
var dist_default = dataUriToBuffer;

// node_modules/node-fetch/src/body.js
var import_node_stream = __toESM(require("node:stream"), 1);
var import_node_util = require("node:util");
var import_node_buffer = require("node:buffer");
init_fetch_blob();
init_esm_min();

// node_modules/node-fetch/src/errors/base.js
var FetchBaseError = class extends Error {
  constructor(message, type) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.type = type;
  }
  get name() {
    return this.constructor.name;
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
};

// node_modules/node-fetch/src/errors/fetch-error.js
var FetchError = class extends FetchBaseError {
  /**
   * @param  {string} message -      Error message for human
   * @param  {string} [type] -        Error type for machine
   * @param  {SystemError} [systemError] - For Node.js system error
   */
  constructor(message, type, systemError) {
    super(message, type);
    if (systemError) {
      this.code = this.errno = systemError.code;
      this.erroredSysCall = systemError.syscall;
    }
  }
};

// node_modules/node-fetch/src/utils/is.js
var NAME = Symbol.toStringTag;
var isURLSearchParameters = (object) => {
  return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
};
var isBlob = (object) => {
  return object && typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
};
var isAbortSignal = (object) => {
  return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
};
var isDomainOrSubdomain = (destination, original) => {
  const orig = new URL(original).hostname;
  const dest = new URL(destination).hostname;
  return orig === dest || orig.endsWith(`.${dest}`);
};
var isSameProtocol = (destination, original) => {
  const orig = new URL(original).protocol;
  const dest = new URL(destination).protocol;
  return orig === dest;
};

// node_modules/node-fetch/src/body.js
var pipeline = (0, import_node_util.promisify)(import_node_stream.default.pipeline);
var INTERNALS = Symbol("Body internals");
var Body = class {
  constructor(body, {
    size = 0
  } = {}) {
    let boundary = null;
    if (body === null) {
      body = null;
    } else if (isURLSearchParameters(body)) {
      body = import_node_buffer.Buffer.from(body.toString());
    } else if (isBlob(body)) {
    } else if (import_node_buffer.Buffer.isBuffer(body)) {
    } else if (import_node_util.types.isAnyArrayBuffer(body)) {
      body = import_node_buffer.Buffer.from(body);
    } else if (ArrayBuffer.isView(body)) {
      body = import_node_buffer.Buffer.from(body.buffer, body.byteOffset, body.byteLength);
    } else if (body instanceof import_node_stream.default) {
    } else if (body instanceof FormData) {
      body = formDataToBlob(body);
      boundary = body.type.split("=")[1];
    } else {
      body = import_node_buffer.Buffer.from(String(body));
    }
    let stream = body;
    if (import_node_buffer.Buffer.isBuffer(body)) {
      stream = import_node_stream.default.Readable.from(body);
    } else if (isBlob(body)) {
      stream = import_node_stream.default.Readable.from(body.stream());
    }
    this[INTERNALS] = {
      body,
      stream,
      boundary,
      disturbed: false,
      error: null
    };
    this.size = size;
    if (body instanceof import_node_stream.default) {
      body.on("error", (error_) => {
        const error = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
        this[INTERNALS].error = error;
      });
    }
  }
  get body() {
    return this[INTERNALS].stream;
  }
  get bodyUsed() {
    return this[INTERNALS].disturbed;
  }
  /**
   * Decode response as ArrayBuffer
   *
   * @return  Promise
   */
  async arrayBuffer() {
    const { buffer, byteOffset, byteLength } = await consumeBody(this);
    return buffer.slice(byteOffset, byteOffset + byteLength);
  }
  async formData() {
    const ct = this.headers.get("content-type");
    if (ct.startsWith("application/x-www-form-urlencoded")) {
      const formData = new FormData();
      const parameters = new URLSearchParams(await this.text());
      for (const [name, value] of parameters) {
        formData.append(name, value);
      }
      return formData;
    }
    const { toFormData: toFormData2 } = await Promise.resolve().then(() => (init_multipart_parser(), multipart_parser_exports));
    return toFormData2(this.body, ct);
  }
  /**
   * Return raw response as Blob
   *
   * @return Promise
   */
  async blob() {
    const ct = this.headers && this.headers.get("content-type") || this[INTERNALS].body && this[INTERNALS].body.type || "";
    const buf = await this.arrayBuffer();
    return new fetch_blob_default([buf], {
      type: ct
    });
  }
  /**
   * Decode response as json
   *
   * @return  Promise
   */
  async json() {
    const text = await this.text();
    return JSON.parse(text);
  }
  /**
   * Decode response as text
   *
   * @return  Promise
   */
  async text() {
    const buffer = await consumeBody(this);
    return new TextDecoder().decode(buffer);
  }
  /**
   * Decode response as buffer (non-spec api)
   *
   * @return  Promise
   */
  buffer() {
    return consumeBody(this);
  }
};
Body.prototype.buffer = (0, import_node_util.deprecate)(Body.prototype.buffer, "Please use 'response.arrayBuffer()' instead of 'response.buffer()'", "node-fetch#buffer");
Object.defineProperties(Body.prototype, {
  body: { enumerable: true },
  bodyUsed: { enumerable: true },
  arrayBuffer: { enumerable: true },
  blob: { enumerable: true },
  json: { enumerable: true },
  text: { enumerable: true },
  data: { get: (0, import_node_util.deprecate)(
    () => {
    },
    "data doesn't exist, use json(), text(), arrayBuffer(), or body instead",
    "https://github.com/node-fetch/node-fetch/issues/1000 (response)"
  ) }
});
async function consumeBody(data) {
  if (data[INTERNALS].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS].disturbed = true;
  if (data[INTERNALS].error) {
    throw data[INTERNALS].error;
  }
  const { body } = data;
  if (body === null) {
    return import_node_buffer.Buffer.alloc(0);
  }
  if (!(body instanceof import_node_stream.default)) {
    return import_node_buffer.Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const error = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(error);
        throw error;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error) {
    const error_ = error instanceof FetchBaseError ? error : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error.message}`, "system", error);
    throw error_;
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return import_node_buffer.Buffer.from(accum.join(""));
      }
      return import_node_buffer.Buffer.concat(accum, accumBytes);
    } catch (error) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error.message}`, "system", error);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
var clone = (instance, highWaterMark) => {
  let p1;
  let p2;
  let { body } = instance[INTERNALS];
  if (instance.bodyUsed) {
    throw new Error("cannot clone body after it is used");
  }
  if (body instanceof import_node_stream.default && typeof body.getBoundary !== "function") {
    p1 = new import_node_stream.PassThrough({ highWaterMark });
    p2 = new import_node_stream.PassThrough({ highWaterMark });
    body.pipe(p1);
    body.pipe(p2);
    instance[INTERNALS].stream = p1;
    body = p2;
  }
  return body;
};
var getNonSpecFormDataBoundary = (0, import_node_util.deprecate)(
  (body) => body.getBoundary(),
  "form-data doesn't follow the spec and requires special treatment. Use alternative package",
  "https://github.com/node-fetch/node-fetch/issues/1167"
);
var extractContentType = (body, request) => {
  if (body === null) {
    return null;
  }
  if (typeof body === "string") {
    return "text/plain;charset=UTF-8";
  }
  if (isURLSearchParameters(body)) {
    return "application/x-www-form-urlencoded;charset=UTF-8";
  }
  if (isBlob(body)) {
    return body.type || null;
  }
  if (import_node_buffer.Buffer.isBuffer(body) || import_node_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
    return null;
  }
  if (body instanceof FormData) {
    return `multipart/form-data; boundary=${request[INTERNALS].boundary}`;
  }
  if (body && typeof body.getBoundary === "function") {
    return `multipart/form-data;boundary=${getNonSpecFormDataBoundary(body)}`;
  }
  if (body instanceof import_node_stream.default) {
    return null;
  }
  return "text/plain;charset=UTF-8";
};
var getTotalBytes = (request) => {
  const { body } = request[INTERNALS];
  if (body === null) {
    return 0;
  }
  if (isBlob(body)) {
    return body.size;
  }
  if (import_node_buffer.Buffer.isBuffer(body)) {
    return body.length;
  }
  if (body && typeof body.getLengthSync === "function") {
    return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
  }
  return null;
};
var writeToStream = async (dest, { body }) => {
  if (body === null) {
    dest.end();
  } else {
    await pipeline(body, dest);
  }
};

// node_modules/node-fetch/src/headers.js
var import_node_util2 = require("node:util");
var import_node_http = __toESM(require("node:http"), 1);
var validateHeaderName = typeof import_node_http.default.validateHeaderName === "function" ? import_node_http.default.validateHeaderName : (name) => {
  if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
    const error = new TypeError(`Header name must be a valid HTTP token [${name}]`);
    Object.defineProperty(error, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
    throw error;
  }
};
var validateHeaderValue = typeof import_node_http.default.validateHeaderValue === "function" ? import_node_http.default.validateHeaderValue : (name, value) => {
  if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
    const error = new TypeError(`Invalid character in header content ["${name}"]`);
    Object.defineProperty(error, "code", { value: "ERR_INVALID_CHAR" });
    throw error;
  }
};
var Headers = class _Headers extends URLSearchParams {
  /**
   * Headers class
   *
   * @constructor
   * @param {HeadersInit} [init] - Response headers
   */
  constructor(init) {
    let result = [];
    if (init instanceof _Headers) {
      const raw = init.raw();
      for (const [name, values] of Object.entries(raw)) {
        result.push(...values.map((value) => [name, value]));
      }
    } else if (init == null) {
    } else if (typeof init === "object" && !import_node_util2.types.isBoxedPrimitive(init)) {
      const method = init[Symbol.iterator];
      if (method == null) {
        result.push(...Object.entries(init));
      } else {
        if (typeof method !== "function") {
          throw new TypeError("Header pairs must be iterable");
        }
        result = [...init].map((pair) => {
          if (typeof pair !== "object" || import_node_util2.types.isBoxedPrimitive(pair)) {
            throw new TypeError("Each header pair must be an iterable object");
          }
          return [...pair];
        }).map((pair) => {
          if (pair.length !== 2) {
            throw new TypeError("Each header pair must be a name/value tuple");
          }
          return [...pair];
        });
      }
    } else {
      throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
    }
    result = result.length > 0 ? result.map(([name, value]) => {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return [String(name).toLowerCase(), String(value)];
    }) : void 0;
    super(result);
    return new Proxy(this, {
      get(target, p, receiver) {
        switch (p) {
          case "append":
          case "set":
            return (name, value) => {
              validateHeaderName(name);
              validateHeaderValue(name, String(value));
              return URLSearchParams.prototype[p].call(
                target,
                String(name).toLowerCase(),
                String(value)
              );
            };
          case "delete":
          case "has":
          case "getAll":
            return (name) => {
              validateHeaderName(name);
              return URLSearchParams.prototype[p].call(
                target,
                String(name).toLowerCase()
              );
            };
          case "keys":
            return () => {
              target.sort();
              return new Set(URLSearchParams.prototype.keys.call(target)).keys();
            };
          default:
            return Reflect.get(target, p, receiver);
        }
      }
    });
  }
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
  toString() {
    return Object.prototype.toString.call(this);
  }
  get(name) {
    const values = this.getAll(name);
    if (values.length === 0) {
      return null;
    }
    let value = values.join(", ");
    if (/^content-encoding$/i.test(name)) {
      value = value.toLowerCase();
    }
    return value;
  }
  forEach(callback, thisArg = void 0) {
    for (const name of this.keys()) {
      Reflect.apply(callback, thisArg, [this.get(name), name, this]);
    }
  }
  *values() {
    for (const name of this.keys()) {
      yield this.get(name);
    }
  }
  /**
   * @type {() => IterableIterator<[string, string]>}
   */
  *entries() {
    for (const name of this.keys()) {
      yield [name, this.get(name)];
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Node-fetch non-spec method
   * returning all headers and their values as array
   * @returns {Record<string, string[]>}
   */
  raw() {
    return [...this.keys()].reduce((result, key) => {
      result[key] = this.getAll(key);
      return result;
    }, {});
  }
  /**
   * For better console.log(headers) and also to convert Headers into Node.js Request compatible format
   */
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this.keys()].reduce((result, key) => {
      const values = this.getAll(key);
      if (key === "host") {
        result[key] = values[0];
      } else {
        result[key] = values.length > 1 ? values : values[0];
      }
      return result;
    }, {});
  }
};
Object.defineProperties(
  Headers.prototype,
  ["get", "entries", "forEach", "values"].reduce((result, property) => {
    result[property] = { enumerable: true };
    return result;
  }, {})
);
function fromRawHeaders(headers = []) {
  return new Headers(
    headers.reduce((result, value, index, array) => {
      if (index % 2 === 0) {
        result.push(array.slice(index, index + 2));
      }
      return result;
    }, []).filter(([name, value]) => {
      try {
        validateHeaderName(name);
        validateHeaderValue(name, String(value));
        return true;
      } catch {
        return false;
      }
    })
  );
}

// node_modules/node-fetch/src/utils/is-redirect.js
var redirectStatus = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
var isRedirect = (code) => {
  return redirectStatus.has(code);
};

// node_modules/node-fetch/src/response.js
var INTERNALS2 = Symbol("Response internals");
var Response = class _Response extends Body {
  constructor(body = null, options = {}) {
    super(body, options);
    const status = options.status != null ? options.status : 200;
    const headers = new Headers(options.headers);
    if (body !== null && !headers.has("Content-Type")) {
      const contentType = extractContentType(body, this);
      if (contentType) {
        headers.append("Content-Type", contentType);
      }
    }
    this[INTERNALS2] = {
      type: "default",
      url: options.url,
      status,
      statusText: options.statusText || "",
      headers,
      counter: options.counter,
      highWaterMark: options.highWaterMark
    };
  }
  get type() {
    return this[INTERNALS2].type;
  }
  get url() {
    return this[INTERNALS2].url || "";
  }
  get status() {
    return this[INTERNALS2].status;
  }
  /**
   * Convenience property representing if the request ended normally
   */
  get ok() {
    return this[INTERNALS2].status >= 200 && this[INTERNALS2].status < 300;
  }
  get redirected() {
    return this[INTERNALS2].counter > 0;
  }
  get statusText() {
    return this[INTERNALS2].statusText;
  }
  get headers() {
    return this[INTERNALS2].headers;
  }
  get highWaterMark() {
    return this[INTERNALS2].highWaterMark;
  }
  /**
   * Clone this response
   *
   * @return  Response
   */
  clone() {
    return new _Response(clone(this, this.highWaterMark), {
      type: this.type,
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
      ok: this.ok,
      redirected: this.redirected,
      size: this.size,
      highWaterMark: this.highWaterMark
    });
  }
  /**
   * @param {string} url    The URL that the new response is to originate from.
   * @param {number} status An optional status code for the response (e.g., 302.)
   * @returns {Response}    A Response object.
   */
  static redirect(url, status = 302) {
    if (!isRedirect(status)) {
      throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
    }
    return new _Response(null, {
      headers: {
        location: new URL(url).toString()
      },
      status
    });
  }
  static error() {
    const response = new _Response(null, { status: 0, statusText: "" });
    response[INTERNALS2].type = "error";
    return response;
  }
  static json(data = void 0, init = {}) {
    const body = JSON.stringify(data);
    if (body === void 0) {
      throw new TypeError("data is not JSON serializable");
    }
    const headers = new Headers(init && init.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return new _Response(body, {
      ...init,
      headers
    });
  }
  get [Symbol.toStringTag]() {
    return "Response";
  }
};
Object.defineProperties(Response.prototype, {
  type: { enumerable: true },
  url: { enumerable: true },
  status: { enumerable: true },
  ok: { enumerable: true },
  redirected: { enumerable: true },
  statusText: { enumerable: true },
  headers: { enumerable: true },
  clone: { enumerable: true }
});

// node_modules/node-fetch/src/request.js
var import_node_url = require("node:url");
var import_node_util3 = require("node:util");

// node_modules/node-fetch/src/utils/get-search.js
var getSearch = (parsedURL) => {
  if (parsedURL.search) {
    return parsedURL.search;
  }
  const lastOffset = parsedURL.href.length - 1;
  const hash = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
  return parsedURL.href[lastOffset - hash.length] === "?" ? "?" : "";
};

// node_modules/node-fetch/src/utils/referrer.js
var import_node_net = require("node:net");
function stripURLForUseAsAReferrer(url, originOnly = false) {
  if (url == null) {
    return "no-referrer";
  }
  url = new URL(url);
  if (/^(about|blob|data):$/.test(url.protocol)) {
    return "no-referrer";
  }
  url.username = "";
  url.password = "";
  url.hash = "";
  if (originOnly) {
    url.pathname = "";
    url.search = "";
  }
  return url;
}
var ReferrerPolicy = /* @__PURE__ */ new Set([
  "",
  "no-referrer",
  "no-referrer-when-downgrade",
  "same-origin",
  "origin",
  "strict-origin",
  "origin-when-cross-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url"
]);
var DEFAULT_REFERRER_POLICY = "strict-origin-when-cross-origin";
function validateReferrerPolicy(referrerPolicy) {
  if (!ReferrerPolicy.has(referrerPolicy)) {
    throw new TypeError(`Invalid referrerPolicy: ${referrerPolicy}`);
  }
  return referrerPolicy;
}
function isOriginPotentiallyTrustworthy(url) {
  if (/^(http|ws)s:$/.test(url.protocol)) {
    return true;
  }
  const hostIp = url.host.replace(/(^\[)|(]$)/g, "");
  const hostIPVersion = (0, import_node_net.isIP)(hostIp);
  if (hostIPVersion === 4 && /^127\./.test(hostIp)) {
    return true;
  }
  if (hostIPVersion === 6 && /^(((0+:){7})|(::(0+:){0,6}))0*1$/.test(hostIp)) {
    return true;
  }
  if (url.host === "localhost" || url.host.endsWith(".localhost")) {
    return false;
  }
  if (url.protocol === "file:") {
    return true;
  }
  return false;
}
function isUrlPotentiallyTrustworthy(url) {
  if (/^about:(blank|srcdoc)$/.test(url)) {
    return true;
  }
  if (url.protocol === "data:") {
    return true;
  }
  if (/^(blob|filesystem):$/.test(url.protocol)) {
    return true;
  }
  return isOriginPotentiallyTrustworthy(url);
}
function determineRequestsReferrer(request, { referrerURLCallback, referrerOriginCallback } = {}) {
  if (request.referrer === "no-referrer" || request.referrerPolicy === "") {
    return null;
  }
  const policy = request.referrerPolicy;
  if (request.referrer === "about:client") {
    return "no-referrer";
  }
  const referrerSource = request.referrer;
  let referrerURL = stripURLForUseAsAReferrer(referrerSource);
  let referrerOrigin = stripURLForUseAsAReferrer(referrerSource, true);
  if (referrerURL.toString().length > 4096) {
    referrerURL = referrerOrigin;
  }
  if (referrerURLCallback) {
    referrerURL = referrerURLCallback(referrerURL);
  }
  if (referrerOriginCallback) {
    referrerOrigin = referrerOriginCallback(referrerOrigin);
  }
  const currentURL = new URL(request.url);
  switch (policy) {
    case "no-referrer":
      return "no-referrer";
    case "origin":
      return referrerOrigin;
    case "unsafe-url":
      return referrerURL;
    case "strict-origin":
      if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
        return "no-referrer";
      }
      return referrerOrigin.toString();
    case "strict-origin-when-cross-origin":
      if (referrerURL.origin === currentURL.origin) {
        return referrerURL;
      }
      if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
        return "no-referrer";
      }
      return referrerOrigin;
    case "same-origin":
      if (referrerURL.origin === currentURL.origin) {
        return referrerURL;
      }
      return "no-referrer";
    case "origin-when-cross-origin":
      if (referrerURL.origin === currentURL.origin) {
        return referrerURL;
      }
      return referrerOrigin;
    case "no-referrer-when-downgrade":
      if (isUrlPotentiallyTrustworthy(referrerURL) && !isUrlPotentiallyTrustworthy(currentURL)) {
        return "no-referrer";
      }
      return referrerURL;
    default:
      throw new TypeError(`Invalid referrerPolicy: ${policy}`);
  }
}
function parseReferrerPolicyFromHeader(headers) {
  const policyTokens = (headers.get("referrer-policy") || "").split(/[,\s]+/);
  let policy = "";
  for (const token of policyTokens) {
    if (token && ReferrerPolicy.has(token)) {
      policy = token;
    }
  }
  return policy;
}

// node_modules/node-fetch/src/request.js
var INTERNALS3 = Symbol("Request internals");
var isRequest = (object) => {
  return typeof object === "object" && typeof object[INTERNALS3] === "object";
};
var doBadDataWarn = (0, import_node_util3.deprecate)(
  () => {
  },
  ".data is not a valid RequestInit property, use .body instead",
  "https://github.com/node-fetch/node-fetch/issues/1000 (request)"
);
var Request = class _Request extends Body {
  constructor(input, init = {}) {
    let parsedURL;
    if (isRequest(input)) {
      parsedURL = new URL(input.url);
    } else {
      parsedURL = new URL(input);
      input = {};
    }
    if (parsedURL.username !== "" || parsedURL.password !== "") {
      throw new TypeError(`${parsedURL} is an url with embedded credentials.`);
    }
    let method = init.method || input.method || "GET";
    if (/^(delete|get|head|options|post|put)$/i.test(method)) {
      method = method.toUpperCase();
    }
    if (!isRequest(init) && "data" in init) {
      doBadDataWarn();
    }
    if ((init.body != null || isRequest(input) && input.body !== null) && (method === "GET" || method === "HEAD")) {
      throw new TypeError("Request with GET/HEAD method cannot have body");
    }
    const inputBody = init.body ? init.body : isRequest(input) && input.body !== null ? clone(input) : null;
    super(inputBody, {
      size: init.size || input.size || 0
    });
    const headers = new Headers(init.headers || input.headers || {});
    if (inputBody !== null && !headers.has("Content-Type")) {
      const contentType = extractContentType(inputBody, this);
      if (contentType) {
        headers.set("Content-Type", contentType);
      }
    }
    let signal = isRequest(input) ? input.signal : null;
    if ("signal" in init) {
      signal = init.signal;
    }
    if (signal != null && !isAbortSignal(signal)) {
      throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
    }
    let referrer = init.referrer == null ? input.referrer : init.referrer;
    if (referrer === "") {
      referrer = "no-referrer";
    } else if (referrer) {
      const parsedReferrer = new URL(referrer);
      referrer = /^about:(\/\/)?client$/.test(parsedReferrer) ? "client" : parsedReferrer;
    } else {
      referrer = void 0;
    }
    this[INTERNALS3] = {
      method,
      redirect: init.redirect || input.redirect || "follow",
      headers,
      parsedURL,
      signal,
      referrer
    };
    this.follow = init.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init.follow;
    this.compress = init.compress === void 0 ? input.compress === void 0 ? true : input.compress : init.compress;
    this.counter = init.counter || input.counter || 0;
    this.agent = init.agent || input.agent;
    this.highWaterMark = init.highWaterMark || input.highWaterMark || 16384;
    this.insecureHTTPParser = init.insecureHTTPParser || input.insecureHTTPParser || false;
    this.referrerPolicy = init.referrerPolicy || input.referrerPolicy || "";
  }
  /** @returns {string} */
  get method() {
    return this[INTERNALS3].method;
  }
  /** @returns {string} */
  get url() {
    return (0, import_node_url.format)(this[INTERNALS3].parsedURL);
  }
  /** @returns {Headers} */
  get headers() {
    return this[INTERNALS3].headers;
  }
  get redirect() {
    return this[INTERNALS3].redirect;
  }
  /** @returns {AbortSignal} */
  get signal() {
    return this[INTERNALS3].signal;
  }
  // https://fetch.spec.whatwg.org/#dom-request-referrer
  get referrer() {
    if (this[INTERNALS3].referrer === "no-referrer") {
      return "";
    }
    if (this[INTERNALS3].referrer === "client") {
      return "about:client";
    }
    if (this[INTERNALS3].referrer) {
      return this[INTERNALS3].referrer.toString();
    }
    return void 0;
  }
  get referrerPolicy() {
    return this[INTERNALS3].referrerPolicy;
  }
  set referrerPolicy(referrerPolicy) {
    this[INTERNALS3].referrerPolicy = validateReferrerPolicy(referrerPolicy);
  }
  /**
   * Clone this request
   *
   * @return  Request
   */
  clone() {
    return new _Request(this);
  }
  get [Symbol.toStringTag]() {
    return "Request";
  }
};
Object.defineProperties(Request.prototype, {
  method: { enumerable: true },
  url: { enumerable: true },
  headers: { enumerable: true },
  redirect: { enumerable: true },
  clone: { enumerable: true },
  signal: { enumerable: true },
  referrer: { enumerable: true },
  referrerPolicy: { enumerable: true }
});
var getNodeRequestOptions = (request) => {
  const { parsedURL } = request[INTERNALS3];
  const headers = new Headers(request[INTERNALS3].headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "*/*");
  }
  let contentLengthValue = null;
  if (request.body === null && /^(post|put)$/i.test(request.method)) {
    contentLengthValue = "0";
  }
  if (request.body !== null) {
    const totalBytes = getTotalBytes(request);
    if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
      contentLengthValue = String(totalBytes);
    }
  }
  if (contentLengthValue) {
    headers.set("Content-Length", contentLengthValue);
  }
  if (request.referrerPolicy === "") {
    request.referrerPolicy = DEFAULT_REFERRER_POLICY;
  }
  if (request.referrer && request.referrer !== "no-referrer") {
    request[INTERNALS3].referrer = determineRequestsReferrer(request);
  } else {
    request[INTERNALS3].referrer = "no-referrer";
  }
  if (request[INTERNALS3].referrer instanceof URL) {
    headers.set("Referer", request.referrer);
  }
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "node-fetch");
  }
  if (request.compress && !headers.has("Accept-Encoding")) {
    headers.set("Accept-Encoding", "gzip, deflate, br");
  }
  let { agent } = request;
  if (typeof agent === "function") {
    agent = agent(parsedURL);
  }
  const search = getSearch(parsedURL);
  const options = {
    // Overwrite search to retain trailing ? (issue #776)
    path: parsedURL.pathname + search,
    // The following options are not expressed in the URL
    method: request.method,
    headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
    insecureHTTPParser: request.insecureHTTPParser,
    agent
  };
  return {
    /** @type {URL} */
    parsedURL,
    options
  };
};

// node_modules/node-fetch/src/errors/abort-error.js
var AbortError = class extends FetchBaseError {
  constructor(message, type = "aborted") {
    super(message, type);
  }
};

// node_modules/node-fetch/src/index.js
init_esm_min();
init_from();
var supportedSchemas = /* @__PURE__ */ new Set(["data:", "http:", "https:"]);
async function fetch(url, options_) {
  return new Promise((resolve, reject) => {
    const request = new Request(url, options_);
    const { parsedURL, options } = getNodeRequestOptions(request);
    if (!supportedSchemas.has(parsedURL.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${parsedURL.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (parsedURL.protocol === "data:") {
      const data = dist_default(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve(response2);
      return;
    }
    const send = (parsedURL.protocol === "https:" ? import_node_https.default : import_node_http2.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error = new AbortError("The operation was aborted.");
      reject(error);
      if (request.body && request.body instanceof import_node_stream2.default.Readable) {
        request.body.destroy(error);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(parsedURL.toString(), options);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (error) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${error.message}`, "system", error));
      finalize();
    });
    fixResponseChunkedTransferBadEnding(request_, (error) => {
      if (response && response.body) {
        response.body.destroy(error);
      }
    });
    if (process.version < "v14") {
      request_.on("socket", (s2) => {
        let endedWithEventsCount;
        s2.prependListener("end", () => {
          endedWithEventsCount = s2._eventsCount;
        });
        s2.prependListener("close", (hadError) => {
          if (response && endedWithEventsCount < s2._eventsCount && !hadError) {
            const error = new Error("Premature close");
            error.code = "ERR_STREAM_PREMATURE_CLOSE";
            response.body.emit("error", error);
          }
        });
      });
    }
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        let locationURL = null;
        try {
          locationURL = location === null ? null : new URL(location, request.url);
        } catch {
          if (request.redirect !== "manual") {
            reject(new FetchError(`uri requested responds with an invalid redirect URL: ${location}`, "invalid-redirect"));
            finalize();
            return;
          }
        }
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: clone(request),
              signal: request.signal,
              size: request.size,
              referrer: request.referrer,
              referrerPolicy: request.referrerPolicy
            };
            if (!isDomainOrSubdomain(request.url, locationURL) || !isSameProtocol(request.url, locationURL)) {
              for (const name of ["authorization", "www-authenticate", "cookie", "cookie2"]) {
                requestOptions.headers.delete(name);
              }
            }
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_node_stream2.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
            if (responseReferrerPolicy) {
              requestOptions.referrerPolicy = responseReferrerPolicy;
            }
            resolve(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
          default:
            return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (signal) {
        response_.once("end", () => {
          signal.removeEventListener("abort", abortAndFinalize);
        });
      }
      let body = (0, import_node_stream2.pipeline)(response_, new import_node_stream2.PassThrough(), (error) => {
        if (error) {
          reject(error);
        }
      });
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve(response);
        return;
      }
      const zlibOptions = {
        flush: import_node_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_node_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_node_stream2.pipeline)(body, import_node_zlib.default.createGunzip(zlibOptions), (error) => {
          if (error) {
            reject(error);
          }
        });
        response = new Response(body, responseOptions);
        resolve(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_node_stream2.pipeline)(response_, new import_node_stream2.PassThrough(), (error) => {
          if (error) {
            reject(error);
          }
        });
        raw.once("data", (chunk) => {
          if ((chunk[0] & 15) === 8) {
            body = (0, import_node_stream2.pipeline)(body, import_node_zlib.default.createInflate(), (error) => {
              if (error) {
                reject(error);
              }
            });
          } else {
            body = (0, import_node_stream2.pipeline)(body, import_node_zlib.default.createInflateRaw(), (error) => {
              if (error) {
                reject(error);
              }
            });
          }
          response = new Response(body, responseOptions);
          resolve(response);
        });
        raw.once("end", () => {
          if (!response) {
            response = new Response(body, responseOptions);
            resolve(response);
          }
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_node_stream2.pipeline)(body, import_node_zlib.default.createBrotliDecompress(), (error) => {
          if (error) {
            reject(error);
          }
        });
        response = new Response(body, responseOptions);
        resolve(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve(response);
    });
    writeToStream(request_, request).catch(reject);
  });
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
  const LAST_CHUNK = import_node_buffer2.Buffer.from("0\r\n\r\n");
  let isChunkedTransfer = false;
  let properLastChunkReceived = false;
  let previousChunk;
  request.on("response", (response) => {
    const { headers } = response;
    isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
  });
  request.on("socket", (socket) => {
    const onSocketClose = () => {
      if (isChunkedTransfer && !properLastChunkReceived) {
        const error = new Error("Premature close");
        error.code = "ERR_STREAM_PREMATURE_CLOSE";
        errorCallback(error);
      }
    };
    const onData = (buf) => {
      properLastChunkReceived = import_node_buffer2.Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
      if (!properLastChunkReceived && previousChunk) {
        properLastChunkReceived = import_node_buffer2.Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && import_node_buffer2.Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
      }
      previousChunk = buf;
    };
    socket.prependListener("close", onSocketClose);
    socket.on("data", onData);
    request.on("close", () => {
      socket.removeListener("close", onSocketClose);
      socket.removeListener("data", onData);
    });
  });
}

// src/server/telegramService.ts
var TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
var TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
var lastAlertTimestamp = 0;
var ALERT_COOLDOWN_MS = 3 * 60 * 1e3;
async function sendTelegramAlert(errorMessage, contextInfo) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("[TelegramService] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur di .env. Notifikasi Telegram dilewati.");
      return;
    }
    const now = Date.now();
    if (now - lastAlertTimestamp < ALERT_COOLDOWN_MS) {
      return;
    }
    lastAlertTimestamp = now;
    const text = `\u{1F6A8} *DATAFORGE SYSTEM ALERT*

\u26A0\uFE0F *Gangguan Koneksi Database Online*
\u{1F552} Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
\u274C Error Detail:
\`\`\`
${errorMessage}
\`\`\`
` + (contextInfo ? `\u2139\uFE0F Konteks: ${contextInfo}
` : "") + `
\u{1F504} _Sistem otomatis mencoba menghubungkan ulang ke database online..._`;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown"
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[TelegramService] Gagal mengirim alert ke Telegram:", errText);
    }
  } catch (err) {
    console.error("[TelegramService] Error memanggil Telegram Bot API:", err);
  }
}

// src/server/mysqlService.ts
var SCHEMA_FILE = import_path2.default.resolve(process.cwd(), "database/schema.mysql.sql");
var currentPool = null;
var lastError = void 0;
var lastConnectedAt = void 0;
function getEnvDbConfig() {
  const uri = (process.env.DATABASE_URL || process.env.MYSQL_URL || "").trim();
  const host = (process.env.DB_HOST || process.env.MYSQL_HOST || "").trim();
  const portStr = (process.env.DB_PORT || process.env.MYSQL_PORT || "").trim();
  const port = portStr ? parseInt(portStr, 10) : 3306;
  const user = (process.env.DB_USER || process.env.MYSQL_USER || "").trim();
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "";
  const database = (process.env.DB_NAME || process.env.MYSQL_DATABASE || "").trim();
  const ssl = process.env.DB_SSL === "true" || process.env.MYSQL_SSL === "true" || false;
  const isConfigured = Boolean(uri.length > 0 || host.length > 0 && user.length > 0 && database.length > 0);
  return {
    enabled: isConfigured,
    host: host || (uri ? "" : "localhost"),
    port: isNaN(port) ? 3306 : port,
    user: user || "",
    password,
    database: database || "",
    ssl,
    uri
  };
}
function getSafeDbConfig() {
  const envCfg = getEnvDbConfig();
  const rawUri = envCfg.uri || "";
  const maskedUri = rawUri ? rawUri.replace(/:([^@]+)@/, ":\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022@") : "";
  return {
    isConfiguredInEnv: envCfg.enabled,
    host: envCfg.host,
    port: envCfg.port,
    user: envCfg.user,
    database: envCfg.database,
    ssl: envCfg.ssl,
    uri: maskedUri,
    hasPassword: Boolean(envCfg.password && envCfg.password.length > 0),
    envVariablesDetected: {
      hasDbHost: Boolean(process.env.DB_HOST || process.env.MYSQL_HOST),
      hasDbPort: Boolean(process.env.DB_PORT || process.env.MYSQL_PORT),
      hasDbUser: Boolean(process.env.DB_USER || process.env.MYSQL_USER),
      hasDbPassword: Boolean(process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD),
      hasDbName: Boolean(process.env.DB_NAME || process.env.MYSQL_DATABASE),
      hasDbSsl: Boolean(process.env.DB_SSL || process.env.MYSQL_SSL),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.MYSQL_URL)
    }
  };
}
function parseConnectionOptions(cfg) {
  if (cfg.uri && (cfg.uri.startsWith("mysql://") || cfg.uri.startsWith("mysql2://"))) {
    const url = new URL(cfg.uri);
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, "") || "dataforge_db",
      ssl: cfg.ssl ? { rejectUnauthorized: false } : void 0,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8e3
    };
  }
  return {
    host: cfg.host || "localhost",
    port: cfg.port || 3306,
    user: cfg.user || "root",
    password: cfg.password || "",
    database: cfg.database || "dataforge_db",
    ssl: cfg.ssl ? { rejectUnauthorized: false } : void 0,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8e3
  };
}
async function testConnection(cfg) {
  const startTime = Date.now();
  let tempPool = null;
  try {
    const opts = parseConnectionOptions(cfg);
    tempPool = import_promise.default.createPool({ ...opts, connectionLimit: 1 });
    await tempPool.query("SELECT 1 + 1 AS pingResult");
    const latencyMs = Date.now() - startTime;
    return { success: true, latencyMs };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  } finally {
    if (tempPool) {
      try {
        await tempPool.end();
      } catch (_) {
      }
    }
  }
}
async function testEnvConnection() {
  const cfg = getEnvDbConfig();
  if (!cfg.enabled) {
    return {
      success: false,
      error: "Variabel lingkungan Database belum diatur di .env (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD atau DATABASE_URL)."
    };
  }
  return testConnection(cfg);
}
async function addColumnIfNotExists(pool, table, column, colDef) {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
      [table, column]
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef}`);
    }
  } catch (err) {
  }
}
async function initMySQLTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_projects\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`owner_id\` VARCHAR(64) NULL,
      \`owner_email\` VARCHAR(255) NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NULL,
      \`token\` VARCHAR(128) NOT NULL,
      \`color\` VARCHAR(50) NOT NULL DEFAULT 'indigo',
      \`icon\` VARCHAR(50) NOT NULL DEFAULT 'Database',
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_project_token\` (\`token\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_tables\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`project_id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`slug\` VARCHAR(128) NOT NULL,
      \`description\` TEXT NULL,
      \`primary_key\` VARCHAR(64) NOT NULL DEFAULT 'id',
      \`token\` VARCHAR(128) NULL,
      \`fields\` LONGTEXT NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_project_slug\` (\`project_id\`, \`slug\`),
      KEY \`idx_table_token\` (\`token\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_records\` (
      \`id\` VARCHAR(128) NOT NULL,
      \`table_id\` VARCHAR(64) NOT NULL,
      \`project_id\` VARCHAR(64) NOT NULL,
      \`data\` LONGTEXT NOT NULL,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`table_id\`, \`id\`),
      KEY \`idx_records_project\` (\`project_id\`),
      KEY \`idx_records_table\` (\`table_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_settings\` (
      \`key\` VARCHAR(64) NOT NULL,
      \`value\` LONGTEXT NOT NULL,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_smtp_accounts\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`gmail_user\` VARCHAR(255) NOT NULL,
      \`gmail_app_password\` VARCHAR(255) NOT NULL,
      \`from_name\` VARCHAR(255) NOT NULL DEFAULT 'DataForge API Studio',
      \`host\` VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
      \`port\` INT NOT NULL DEFAULT 465,
      \`secure\` TINYINT(1) NOT NULL DEFAULT 1,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`order_num\` INT NOT NULL DEFAULT 1,
      \`last_tested_at\` DATETIME NULL,
      \`last_status\` VARCHAR(32) NOT NULL DEFAULT 'untested',
      \`last_error_message\` TEXT NULL,
      \`success_count\` INT NOT NULL DEFAULT 0,
      \`fail_count\` INT NOT NULL DEFAULT 0,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_smtp_active_order\` (\`is_active\`, \`order_num\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`df_users\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255) NOT NULL,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`role\` ENUM('superadmin', 'admin', 'user') NOT NULL DEFAULT 'user',
      \`is_verified\` TINYINT(1) NOT NULL DEFAULT 0,
      \`verification_code\` VARCHAR(32) NULL,
      \`verification_token\` VARCHAR(128) NULL,
      \`verification_expires_at\` DATETIME NULL,
      \`reset_password_code\` VARCHAR(32) NULL,
      \`reset_password_token\` VARCHAR(128) NULL,
      \`reset_password_expires_at\` DATETIME NULL,
      \`last_otp_sent_at\` DATETIME NULL,
      \`last_reset_sent_at\` DATETIME NULL,
      \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_user_email\` (\`email\`),
      KEY \`idx_user_role\` (\`role\`),
      KEY \`idx_user_verified\` (\`is_verified\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await addColumnIfNotExists(pool, "df_users", "reset_password_code", "VARCHAR(32) NULL");
  await addColumnIfNotExists(pool, "df_users", "reset_password_token", "VARCHAR(128) NULL");
  await addColumnIfNotExists(pool, "df_users", "reset_password_expires_at", "DATETIME NULL");
  await addColumnIfNotExists(pool, "df_users", "last_otp_sent_at", "DATETIME NULL");
  await addColumnIfNotExists(pool, "df_users", "last_reset_sent_at", "DATETIME NULL");
  const [userCountRows] = await pool.query("SELECT COUNT(*) AS total FROM df_users");
  if (userCountRows[0]?.total === 0) {
    const seedList = getAllUsers();
    for (const u of seedList) {
      await pool.query(
        `INSERT INTO df_users (id, name, email, password_hash, role, is_verified, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.passwordHash, u.role, u.isVerified ? 1 : 0, u.isActive ? 1 : 0, new Date(u.createdAt), new Date(u.updatedAt)]
      );
    }
    console.log(`[MySQL] Berhasil seeding ${seedList.length} akun bawaan ke tabel df_users.`);
  }
}
async function connectMySQL(cfg) {
  const finalConfig = cfg || getEnvDbConfig();
  try {
    if (currentPool) {
      try {
        await currentPool.end();
      } catch (_) {
      }
      currentPool = null;
    }
    const opts = parseConnectionOptions(finalConfig);
    currentPool = import_promise.default.createPool(opts);
    await currentPool.query("SELECT 1 AS ready");
    await initMySQLTables(currentPool);
    lastError = void 0;
    lastConnectedAt = (/* @__PURE__ */ new Date()).toISOString();
    const targetDesc = finalConfig.uri ? `Cloud URI (${finalConfig.uri.split("@")[1] || "remote"})` : `${finalConfig.database} @ ${finalConfig.host}:${finalConfig.port}`;
    return {
      success: true,
      message: `Berhasil terhubung ke database online MySQL (${targetDesc})!`
    };
  } catch (err) {
    lastError = err.message || String(err);
    if (currentPool) {
      try {
        await currentPool.end();
      } catch (_) {
      }
      currentPool = null;
    }
    await sendTelegramAlert(lastError || "Unknown connection error", "Gangguan Koneksi Database MySQL Online");
    return {
      success: false,
      message: "Gagal menghubungkan ke database MySQL online dari variabel lingkungan (.env)",
      error: lastError
    };
  }
}
var autoReconnectTimer = null;
function startAutoReconnectLoop() {
  if (autoReconnectTimer) return;
  autoReconnectTimer = setInterval(async () => {
    const cfg = getEnvDbConfig();
    if (cfg.enabled && !currentPool) {
      console.log("[MySQL] Auto-reconnect: Mencoba menghubungkan ulang ke database online...");
      const res = await connectMySQL(cfg);
      if (res.success) {
        console.log("[MySQL] Auto-reconnect: Berhasil terhubung kembali ke database online!");
      }
    }
  }, 1e4);
}
async function disconnectMySQL() {
  if (currentPool) {
    try {
      await currentPool.end();
    } catch (_) {
    }
    currentPool = null;
  }
  lastError = void 0;
  return { success: true };
}
function isMySQLConnected() {
  return currentPool !== null;
}
async function getMySQLStatus() {
  const envCfg = getEnvDbConfig();
  if (!currentPool) {
    return {
      engine: "local",
      connected: false,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      ssl: envCfg.ssl,
      error: lastError
    };
  }
  const start = Date.now();
  try {
    await currentPool.query("SELECT 1");
    const latencyMs = Date.now() - start;
    const [tableRows] = await currentPool.query("SELECT COUNT(*) AS total FROM df_tables");
    const [recordRows] = await currentPool.query("SELECT COUNT(*) AS total FROM df_records");
    return {
      engine: "mysql",
      connected: true,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      ssl: envCfg.ssl,
      latencyMs,
      tablesCount: tableRows[0]?.total || 0,
      recordsCount: recordRows[0]?.total || 0,
      lastConnectedAt
    };
  } catch (err) {
    lastError = err.message || String(err);
    return {
      engine: "mysql",
      connected: false,
      host: envCfg.host,
      port: envCfg.port,
      database: envCfg.database,
      user: envCfg.user,
      error: lastError
    };
  }
}
async function loadDataFromMySQL() {
  if (!currentPool) {
    throw new Error("MySQL connection pool tidak aktif");
  }
  const [projRows] = await currentPool.query("SELECT * FROM df_projects ORDER BY created_at ASC");
  const [tblRows] = await currentPool.query("SELECT * FROM df_tables ORDER BY created_at ASC");
  const [recRows] = await currentPool.query("SELECT * FROM df_records ORDER BY created_at ASC");
  const loadedProjects = projRows.map((r2) => ({
    id: r2.id,
    ownerId: r2.owner_id || void 0,
    ownerEmail: r2.owner_email || void 0,
    name: r2.name,
    description: r2.description || "",
    token: r2.token,
    color: r2.color || "indigo",
    icon: r2.icon || "Database",
    createdAt: r2.created_at ? new Date(r2.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: r2.updated_at ? new Date(r2.updated_at).toISOString() : void 0
  }));
  const loadedTables = tblRows.map((r2) => {
    let fields = [];
    try {
      fields = typeof r2.fields === "string" ? JSON.parse(r2.fields) : r2.fields;
    } catch (_) {
      fields = [];
    }
    return {
      id: r2.id,
      projectId: r2.project_id,
      name: r2.name,
      slug: r2.slug,
      description: r2.description || "",
      token: r2.token || void 0,
      primaryKey: r2.primary_key || "id",
      fields,
      createdAt: r2.created_at ? new Date(r2.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: r2.updated_at ? new Date(r2.updated_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  const loadedRecords = recRows.map((r2) => {
    let data = {};
    try {
      data = typeof r2.data === "string" ? JSON.parse(r2.data) : r2.data;
    } catch (_) {
      data = {};
    }
    return {
      id: isNaN(Number(r2.id)) ? r2.id : Number(r2.id),
      tableId: r2.table_id,
      projectId: r2.project_id,
      data,
      createdAt: r2.created_at ? new Date(r2.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: r2.updated_at ? new Date(r2.updated_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  return {
    projects: loadedProjects,
    tables: loadedTables,
    records: loadedRecords
  };
}
async function syncAllToMySQL(projects2, tables2, records2) {
  if (!currentPool) {
    throw new Error("MySQL connection pool tidak aktif");
  }
  await initMySQLTables(currentPool);
  const conn = await currentPool.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of projects2) {
      await conn.query(
        `INSERT INTO df_projects (id, owner_id, owner_email, name, description, token, color, icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           owner_id = VALUES(owner_id),
           owner_email = VALUES(owner_email),
           name = VALUES(name),
           description = VALUES(description),
           token = VALUES(token),
           color = VALUES(color),
           icon = VALUES(icon),
           updated_at = VALUES(updated_at)`,
        [p.id, p.ownerId || null, p.ownerEmail || null, p.name, p.description, p.token, p.color || "indigo", p.icon || "Database", new Date(p.createdAt), new Date(p.updatedAt || p.createdAt)]
      );
    }
    for (const t2 of tables2) {
      await conn.query(
        `INSERT INTO df_tables (id, project_id, name, slug, description, primary_key, token, fields, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           slug = VALUES(slug),
           description = VALUES(description),
           primary_key = VALUES(primary_key),
           token = VALUES(token),
           fields = VALUES(fields),
           updated_at = VALUES(updated_at)`,
        [t2.id, t2.projectId, t2.name, t2.slug, t2.description || "", t2.primaryKey || "id", t2.token || null, JSON.stringify(t2.fields), new Date(t2.createdAt), new Date(t2.updatedAt)]
      );
    }
    for (const r2 of records2) {
      const rec = r2;
      await conn.query(
        `INSERT INTO df_records (id, table_id, project_id, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           project_id = VALUES(project_id),
           data = VALUES(data),
           updated_at = VALUES(updated_at)`,
        [String(rec.id), rec.tableId || rec.table_id, rec.projectId || rec.project_id, JSON.stringify(rec.data), new Date(rec.createdAt), new Date(rec.updatedAt)]
      );
    }
    await conn.commit();
    return {
      success: true,
      projectsCount: projects2.length,
      tablesCount: tables2.length,
      recordsCount: records2.length
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
async function mysqlUpsertProject(p) {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_projects (id, owner_id, owner_email, name, description, token, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         owner_id = VALUES(owner_id),
         owner_email = VALUES(owner_email),
         name = VALUES(name),
         description = VALUES(description),
         token = VALUES(token),
         color = VALUES(color),
         icon = VALUES(icon),
         updated_at = VALUES(updated_at)`,
      [p.id, p.ownerId || null, p.ownerEmail || null, p.name, p.description, p.token, p.color || "indigo", p.icon || "Database", new Date(p.createdAt), new Date(p.updatedAt || p.createdAt)]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting project:", err);
  }
}
async function mysqlDeleteProject(projectId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_projects WHERE id = ?", [projectId]);
    await currentPool.query("DELETE FROM df_tables WHERE project_id = ?", [projectId]);
    await currentPool.query("DELETE FROM df_records WHERE project_id = ?", [projectId]);
  } catch (err) {
    console.error("[MySQL] Error deleting project:", err);
  }
}
async function mysqlUpsertTable(t2) {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_tables (id, project_id, name, slug, description, primary_key, token, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         primary_key = VALUES(primary_key),
         token = VALUES(token),
         fields = VALUES(fields),
         updated_at = VALUES(updated_at)`,
      [t2.id, t2.projectId, t2.name, t2.slug, t2.description || "", t2.primaryKey || "id", t2.token || null, JSON.stringify(t2.fields), new Date(t2.createdAt), new Date(t2.updatedAt)]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting table:", err);
  }
}
async function mysqlDeleteTable(tableId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_tables WHERE id = ?", [tableId]);
    await currentPool.query("DELETE FROM df_records WHERE table_id = ?", [tableId]);
  } catch (err) {
    console.error("[MySQL] Error deleting table:", err);
  }
}
async function mysqlUpsertRecord(r2) {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_records (id, table_id, project_id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         project_id = VALUES(project_id),
         data = VALUES(data),
         updated_at = VALUES(updated_at)`,
      [String(r2.id), r2.tableId, r2.projectId, JSON.stringify(r2.data), new Date(r2.createdAt), new Date(r2.updatedAt)]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting record:", err);
  }
}
async function mysqlDeleteRecord(tableId, recordId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_records WHERE table_id = ? AND id = ?", [tableId, String(recordId)]);
  } catch (err) {
    console.error("[MySQL] Error deleting record:", err);
  }
}
async function loadUsersFromMySQL() {
  if (!currentPool) return [];
  try {
    const [rows] = await currentPool.query("SELECT * FROM df_users ORDER BY created_at ASC");
    return rows.map((r2) => ({
      id: r2.id,
      name: r2.name,
      email: r2.email,
      passwordHash: r2.password_hash,
      role: r2.role,
      isVerified: Boolean(r2.is_verified),
      verificationCode: r2.verification_code || void 0,
      verificationToken: r2.verification_token || void 0,
      verificationExpiresAt: r2.verification_expires_at ? new Date(r2.verification_expires_at).toISOString() : void 0,
      resetPasswordCode: r2.reset_password_code || void 0,
      resetPasswordToken: r2.reset_password_token || void 0,
      resetPasswordExpiresAt: r2.reset_password_expires_at ? new Date(r2.reset_password_expires_at).toISOString() : void 0,
      lastOtpSentAt: r2.last_otp_sent_at ? new Date(r2.last_otp_sent_at).toISOString() : void 0,
      lastResetSentAt: r2.last_reset_sent_at ? new Date(r2.last_reset_sent_at).toISOString() : void 0,
      isActive: Boolean(r2.is_active),
      createdAt: new Date(r2.created_at).toISOString(),
      updatedAt: new Date(r2.updated_at).toISOString()
    }));
  } catch (err) {
    console.error("[MySQL] Error loading users:", err);
    return [];
  }
}
async function findUserByEmailFromMySQL(email) {
  if (!currentPool) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await currentPool.query("SELECT * FROM df_users WHERE LOWER(email) = ? LIMIT 1", [cleanEmail]);
    if (rows.length === 0) return null;
    const r2 = rows[0];
    return {
      id: r2.id,
      name: r2.name,
      email: r2.email,
      passwordHash: r2.password_hash,
      role: r2.role,
      isVerified: Boolean(r2.is_verified),
      verificationCode: r2.verification_code || void 0,
      verificationToken: r2.verification_token || void 0,
      verificationExpiresAt: r2.verification_expires_at ? new Date(r2.verification_expires_at).toISOString() : void 0,
      resetPasswordCode: r2.reset_password_code || void 0,
      resetPasswordToken: r2.reset_password_token || void 0,
      resetPasswordExpiresAt: r2.reset_password_expires_at ? new Date(r2.reset_password_expires_at).toISOString() : void 0,
      lastOtpSentAt: r2.last_otp_sent_at ? new Date(r2.last_otp_sent_at).toISOString() : void 0,
      lastResetSentAt: r2.last_reset_sent_at ? new Date(r2.last_reset_sent_at).toISOString() : void 0,
      isActive: Boolean(r2.is_active),
      createdAt: new Date(r2.created_at).toISOString(),
      updatedAt: new Date(r2.updated_at).toISOString()
    };
  } catch (err) {
    console.error("[MySQL] Error finding user by email:", err);
    return null;
  }
}
async function mysqlUpsertUser(u) {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_users (id, name, email, password_hash, role, is_verified, verification_code, verification_token, verification_expires_at, reset_password_code, reset_password_token, reset_password_expires_at, last_otp_sent_at, last_reset_sent_at, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash),
         role = VALUES(role),
         is_verified = VALUES(is_verified),
         verification_code = VALUES(verification_code),
         verification_token = VALUES(verification_token),
         verification_expires_at = VALUES(verification_expires_at),
         reset_password_code = VALUES(reset_password_code),
         reset_password_token = VALUES(reset_password_token),
         reset_password_expires_at = VALUES(reset_password_expires_at),
         last_otp_sent_at = VALUES(last_otp_sent_at),
         last_reset_sent_at = VALUES(last_reset_sent_at),
         is_active = VALUES(is_active),
         updated_at = VALUES(updated_at)`,
      [
        u.id,
        u.name,
        u.email,
        u.passwordHash,
        u.role,
        u.isVerified ? 1 : 0,
        u.verificationCode || null,
        u.verificationToken || null,
        u.verificationExpiresAt ? new Date(u.verificationExpiresAt) : null,
        u.resetPasswordCode || null,
        u.resetPasswordToken || null,
        u.resetPasswordExpiresAt ? new Date(u.resetPasswordExpiresAt) : null,
        u.lastOtpSentAt ? new Date(u.lastOtpSentAt) : null,
        u.lastResetSentAt ? new Date(u.lastResetSentAt) : null,
        u.isActive ? 1 : 0,
        new Date(u.createdAt),
        new Date(u.updatedAt)
      ]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting user:", err);
  }
}
async function mysqlDeleteUser(userId) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_users WHERE id = ?", [userId]);
  } catch (err) {
    console.error("[MySQL] Error deleting user:", err);
  }
}
async function syncAllUsersToMySQL(users2) {
  if (!currentPool) return;
  for (const u of users2) {
    await mysqlUpsertUser(u);
  }
}
async function loadSmtpAccountsFromMySQL() {
  if (!currentPool) return [];
  try {
    const [rows] = await currentPool.query("SELECT * FROM df_smtp_accounts ORDER BY order_num ASC, created_at ASC");
    return rows.map((r2) => ({
      id: r2.id,
      name: r2.name,
      gmailUser: r2.gmail_user,
      gmailAppPassword: r2.gmail_app_password,
      fromName: r2.from_name || "DataForge API Studio",
      host: r2.host || "smtp.gmail.com",
      port: r2.port || 465,
      secure: Boolean(r2.secure),
      isActive: Boolean(r2.is_active),
      order: r2.order_num || 1,
      lastTestedAt: r2.last_tested_at ? new Date(r2.last_tested_at).toISOString() : void 0,
      lastStatus: r2.last_status || "untested",
      lastErrorMessage: r2.last_error_message || void 0,
      successCount: r2.success_count || 0,
      failCount: r2.fail_count || 0
    }));
  } catch (err) {
    console.error("[MySQL] Error loading SMTP accounts:", err);
    return [];
  }
}
async function mysqlUpsertSmtpAccount(acc) {
  if (!currentPool) return;
  try {
    await currentPool.query(
      `INSERT INTO df_smtp_accounts (
        id, name, gmail_user, gmail_app_password, from_name, host, port, secure, is_active, order_num,
        last_tested_at, last_status, last_error_message, success_count, fail_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        gmail_user = VALUES(gmail_user),
        gmail_app_password = VALUES(gmail_app_password),
        from_name = VALUES(from_name),
        host = VALUES(host),
        port = VALUES(port),
        secure = VALUES(secure),
        is_active = VALUES(is_active),
        order_num = VALUES(order_num),
        last_tested_at = VALUES(last_tested_at),
        last_status = VALUES(last_status),
        last_error_message = VALUES(last_error_message),
        success_count = VALUES(success_count),
        fail_count = VALUES(fail_count),
        updated_at = NOW()`,
      [
        acc.id,
        acc.name,
        acc.gmailUser,
        acc.gmailAppPassword,
        acc.fromName || "DataForge API Studio",
        acc.host || "smtp.gmail.com",
        acc.port || 465,
        acc.secure ? 1 : 0,
        acc.isActive ? 1 : 0,
        acc.order || 1,
        acc.lastTestedAt ? new Date(acc.lastTestedAt) : null,
        acc.lastStatus || "untested",
        acc.lastErrorMessage || null,
        acc.successCount || 0,
        acc.failCount || 0
      ]
    );
  } catch (err) {
    console.error("[MySQL] Error upserting SMTP account:", err);
  }
}
async function mysqlDeleteSmtpAccount(id) {
  if (!currentPool) return;
  try {
    await currentPool.query("DELETE FROM df_smtp_accounts WHERE id = ?", [id]);
  } catch (err) {
    console.error("[MySQL] Error deleting SMTP account:", err);
  }
}
async function syncAllSmtpAccountsToMySQL(accounts) {
  if (!currentPool) return;
  for (const acc of accounts) {
    await mysqlUpsertSmtpAccount(acc);
  }
}
function getSchemaSQLContent() {
  try {
    if (import_fs2.default.existsSync(SCHEMA_FILE)) {
      return import_fs2.default.readFileSync(SCHEMA_FILE, "utf-8");
    }
  } catch (err) {
    console.error("[MySQL] Gagal membaca schema.mysql.sql:", err);
  }
  return "-- Schema file not found";
}
async function getDatabaseTablesList() {
  if (!currentPool) {
    return ["df_users", "df_projects", "df_tables", "df_records", "df_smtp_accounts"];
  }
  try {
    const [rows] = await currentPool.query("SHOW TABLES");
    return rows.map((r2) => Object.values(r2)[0]);
  } catch (err) {
    return [];
  }
}
async function getTableDataPaginated(tableName, page = 1, limit = 10) {
  const offset = Math.max(0, (page - 1) * limit);
  if (!currentPool) {
    return { columns: [], rows: [], total: 0 };
  }
  try {
    const [countRows] = await currentPool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = countRows[0]?.total || 0;
    const [rows] = await currentPool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [Number(limit), Number(offset)]);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { columns, rows, total };
  } catch (err) {
    console.error("[MySQL] Error querying table data:", err);
    return { columns: [], rows: [], total: 0 };
  }
}

// server.ts
var DATA_FILE = import_path3.default.resolve(process.cwd(), "data.json");
var projects = [];
var tables = [];
var records = [];
var nextIdCounters = {};
function getNextRecordId(tableId) {
  if (!nextIdCounters[tableId]) {
    const tableRecords = records.filter((r2) => r2.tableId === tableId);
    let maxId = 0;
    for (const r2 of tableRecords) {
      const num = typeof r2.id === "number" ? r2.id : parseInt(String(r2.id), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
    nextIdCounters[tableId] = maxId + 1;
  }
  const id = nextIdCounters[tableId]++;
  return id;
}
function seedDefaultDatabase() {
  const proj1Id = "proj-sekolah";
  const proj2Id = "proj-toko";
  const defaultProjects = [
    {
      id: proj1Id,
      name: "Database Sistem Sekolah",
      description: "Pusat data siswa, guru, dan administrasi akademik sekolah dengan akses REST API",
      token: "sb_live_sekolah_9823471029384721",
      color: "indigo",
      icon: "GraduationCap",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: proj2Id,
      name: "Database Toko Online & Produk",
      description: "Katalog produk e-commerce, stok gudang, dan riwayat transaksi pesanan",
      token: "sb_live_toko_4918237491029384",
      color: "emerald",
      icon: "Store",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const defaultTables = [
    {
      id: "tbl-siswa",
      projectId: proj1Id,
      name: "Data Siswa",
      slug: "siswa",
      description: "Daftar biodata siswa aktif dan status akademik",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "nis", label: "NIS", type: "text", required: true },
        { key: "nama", label: "Nama Siswa", type: "text", required: true },
        { key: "kelas", label: "Kelas", type: "select", required: true, options: ["X RPL 1", "XI RPL 1", "XII RPL 1", "XII TKJ 2"] },
        { key: "jurusan", label: "Jurusan", type: "text", required: false },
        { key: "email", label: "Email", type: "email", required: false },
        { key: "status", label: "Status", type: "select", required: true, options: ["Aktif", "Lulus", "Cuti"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "tbl-guru",
      projectId: proj1Id,
      name: "Data Guru",
      slug: "guru",
      description: "Tenaga pengajar dan pengampu mata pelajaran",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "nip", label: "NIP", type: "text", required: true },
        { key: "nama", label: "Nama Guru", type: "text", required: true },
        { key: "mata_pelajaran", label: "Mata Pelajaran", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: false },
        { key: "status", label: "Status", type: "select", required: true, options: ["Aktif", "Cuti"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "tbl-produk",
      projectId: proj2Id,
      name: "Katalog Produk",
      slug: "produk",
      description: "Master data barang dan stok ketersediaan",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "sku", label: "Kode SKU", type: "text", required: true },
        { key: "nama_produk", label: "Nama Produk", type: "text", required: true },
        { key: "kategori", label: "Kategori", type: "select", required: true, options: ["Elektronik", "Pakaian", "Aksesoris", "Buku"] },
        { key: "harga", label: "Harga (Rp)", type: "number", required: true },
        { key: "stok", label: "Stok Barang", type: "number", required: true },
        { key: "status", label: "Status Stok", type: "select", required: true, options: ["Tersedia", "Habis", "Preorder"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "tbl-pesanan",
      projectId: proj2Id,
      name: "Data Pesanan",
      slug: "pesanan",
      description: "Catatan order masuk dari aplikasi luar atau web",
      primaryKey: "id",
      fields: [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        { key: "nomor_resi", label: "No. Pesanan", type: "text", required: true },
        { key: "pelanggan", label: "Nama Pelanggan", type: "text", required: true },
        { key: "total_bayar", label: "Total Bayar (Rp)", type: "number", required: true },
        { key: "metode", label: "Metode Bayar", type: "select", required: true, options: ["Transfer Bank", "QRIS", "COD", "E-Wallet"] },
        { key: "status", label: "Status Pesanan", type: "select", required: true, options: ["Dibayar", "Diproses", "Dikirim", "Selesai"] }
      ],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const defaultRecords = [
    // Siswa records
    {
      id: 1,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 1, nis: "202401", nama: "Ahmad Faisal", kelas: "XII RPL 1", jurusan: "Rekayasa Perangkat Lunak", email: "ahmad@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 2, nis: "202402", nama: "Siti Rahmawati", kelas: "XII RPL 1", jurusan: "Rekayasa Perangkat Lunak", email: "siti@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 3,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 3, nis: "202403", nama: "Budi Kurniawan", kelas: "XII TKJ 2", jurusan: "Teknik Komputer Jaringan", email: "budi@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 4,
      tableId: "tbl-siswa",
      projectId: proj1Id,
      data: { id: 4, nis: "202404", nama: "Dewi Lestari", kelas: "XI RPL 1", jurusan: "Rekayasa Perangkat Lunak", email: "dewi@sekolah.sch.id", status: "Cuti" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    // Guru records
    {
      id: 1,
      tableId: "tbl-guru",
      projectId: proj1Id,
      data: { id: 1, nip: "198501012010", nama: "Ir. Bambang Sugiarto, M.Kom", mata_pelajaran: "Pemrograman Web & REST API", email: "bambang@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-guru",
      projectId: proj1Id,
      data: { id: 2, nip: "199003152015", nama: "Nurul Hidayah, S.Pd", mata_pelajaran: "Basis Data & SQL", email: "nurul@sekolah.sch.id", status: "Aktif" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    // Produk records
    {
      id: 1,
      tableId: "tbl-produk",
      projectId: proj2Id,
      data: { id: 1, sku: "PRD-001", nama_produk: 'Laptop Pro Creator 15"', kategori: "Elektronik", harga: 165e5, stok: 14, status: "Tersedia" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-produk",
      projectId: proj2Id,
      data: { id: 2, sku: "PRD-002", nama_produk: "Mouse Wireless Ergonomic", kategori: "Aksesoris", harga: 35e4, stok: 48, status: "Tersedia" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 3,
      tableId: "tbl-produk",
      projectId: proj2Id,
      data: { id: 3, sku: "PRD-003", nama_produk: "Keyboard Mechanical RGB", kategori: "Elektronik", harga: 85e4, stok: 0, status: "Habis" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    // Pesanan records
    {
      id: 1,
      tableId: "tbl-pesanan",
      projectId: proj2Id,
      data: { id: 1, nomor_resi: "INV-2026-0091", pelanggan: "Hendro Wijaya", total_bayar: 1685e4, metode: "Transfer Bank", status: "Dikirim" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      tableId: "tbl-pesanan",
      projectId: proj2Id,
      data: { id: 2, nomor_resi: "INV-2026-0092", pelanggan: "Anisa Putri", total_bayar: 35e4, metode: "QRIS", status: "Selesai" },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  projects = defaultProjects;
  tables = defaultTables;
  records = defaultRecords;
  nextIdCounters = {
    "tbl-siswa": 5,
    "tbl-guru": 3,
    "tbl-produk": 4,
    "tbl-pesanan": 3
  };
  saveDataToFile();
}
function loadDataFromFile() {
  try {
    if (import_fs3.default.existsSync(DATA_FILE)) {
      const content = import_fs3.default.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.users)) {
        setAllUsers(parsed.users);
      }
      if (Array.isArray(parsed.tables) && Array.isArray(parsed.records)) {
        projects = Array.isArray(parsed.projects) ? parsed.projects : [];
        tables = parsed.tables;
        records = parsed.records;
        nextIdCounters = parsed.nextIdCounters || {};
        console.log(`[Database] Loaded ${projects.length} databases, ${tables.length} tables, ${records.length} records, ${getAllUsers().length} users.`);
        return;
      }
    }
  } catch (err) {
    console.error("[Database] Error reading data.json, re-seeding:", err);
  }
  seedDefaultDatabase();
}
function saveDataToFile() {
  try {
    const data = {
      projects,
      tables,
      records,
      users: getAllUsers(),
      nextIdCounters
    };
    import_fs3.default.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Database] Failed to write data.json:", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  loadDataFromFile();
  const envDbConfig = getEnvDbConfig();
  if (envDbConfig.enabled) {
    console.log("[MySQL] Membaca konfigurasi dari Environment Variables (.env). Menghubungkan ke online database...");
    try {
      const res = await connectMySQL(envDbConfig);
      if (res.success) {
        console.log("[MySQL] Berhasil terhubung ke database online!");
        try {
          const mysqlData = await loadDataFromMySQL();
          if (mysqlData.projects.length > 0) {
            projects = mysqlData.projects;
            tables = mysqlData.tables;
            records = mysqlData.records;
            console.log(`[MySQL] Memuat ${projects.length} project, ${tables.length} tabel, ${records.length} records dari MySQL.`);
          } else {
            console.log("[MySQL] Database MySQL kosong. Mengunggah data lokal ke MySQL...");
            await syncAllToMySQL(projects, tables, records);
          }
          const mysqlUsers = await loadUsersFromMySQL();
          if (mysqlUsers.length > 0) {
            setAllUsers(mysqlUsers);
            console.log(`[MySQL] Memuat ${mysqlUsers.length} pengguna dari MySQL.`);
          } else {
            console.log("[MySQL] Mengunggah akun pengguna ke MySQL...");
            await syncAllUsersToMySQL(getAllUsers());
          }
          await syncMailConfigWithMySQL();
        } catch (syncErr) {
          console.error("[MySQL] Gagal inisialisasi data dari MySQL:", syncErr);
        }
      } else {
        console.error("[MySQL] Belum dapat terhubung ke MySQL online dari .env:", res.error);
      }
    } catch (err) {
      console.error("[MySQL] Gagal inisialisasi koneksi:", err);
    }
  } else {
    console.log("[Database] Tidak ada konfigurasi MySQL di .env. Menggunakan mode penyimpanan lokal (data.json).");
  }
  startAutoReconnectLoop();
  app.use(import_express.default.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });
  app.get("/api/db/status", async (req, res) => {
    try {
      const status = await getMySQLStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/db/config", (req, res) => {
    res.json(getSafeDbConfig());
  });
  app.post("/api/db/test-env", async (req, res) => {
    try {
      const result = await testEnvConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/test", async (req, res) => {
    try {
      const result = await testEnvConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post(["/api/db/reconnect-env", "/api/db/reconnect"], async (req, res) => {
    try {
      const envCfg = getEnvDbConfig();
      if (!envCfg.enabled) {
        return res.status(400).json({
          success: false,
          error: "Variabel lingkungan database belum diatur di file .env atau hosting environment."
        });
      }
      const result = await connectMySQL(envCfg);
      if (result.success) {
        const mysqlData = await loadDataFromMySQL();
        if (mysqlData.projects.length > 0) {
          projects = mysqlData.projects;
          tables = mysqlData.tables;
          records = mysqlData.records;
          saveDataToFile();
        } else {
          await syncAllToMySQL(projects, tables, records);
        }
        const mysqlUsers = await loadUsersFromMySQL();
        if (mysqlUsers.length > 0) {
          setAllUsers(mysqlUsers);
        } else {
          await syncAllUsersToMySQL(getAllUsers());
        }
        await syncMailConfigWithMySQL();
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/connect", async (req, res) => {
    try {
      const envCfg = getEnvDbConfig();
      const result = await connectMySQL(envCfg);
      if (result.success) {
        const mysqlData = await loadDataFromMySQL();
        if (mysqlData.projects.length > 0) {
          projects = mysqlData.projects;
          tables = mysqlData.tables;
          records = mysqlData.records;
          saveDataToFile();
        } else {
          await syncAllToMySQL(projects, tables, records);
        }
        await syncMailConfigWithMySQL();
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/disconnect", async (req, res) => {
    try {
      const result = await disconnectMySQL();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/sync-to-mysql", async (req, res) => {
    try {
      const result = await syncAllToMySQL(projects, tables, records);
      await syncMailConfigWithMySQL();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/db/sync-from-mysql", async (req, res) => {
    try {
      const mysqlData = await loadDataFromMySQL();
      projects = mysqlData.projects;
      tables = mysqlData.tables;
      records = mysqlData.records;
      saveDataToFile();
      await syncMailConfigWithMySQL();
      res.json({
        success: true,
        projectsCount: projects.length,
        tablesCount: tables.length,
        recordsCount: records.length
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/db/schema-sql", (req, res) => {
    res.type("text/plain").send(getSchemaSQLContent());
  });
  app.get("/api/db/tables-list", async (req, res) => {
    try {
      const tablesList = await getDatabaseTablesList();
      res.json({ success: true, tables: tablesList });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message, tables: [] });
    }
  });
  app.get("/api/db/table-rows", async (req, res) => {
    try {
      const tableName = String(req.query.table || "");
      const page = parseInt(String(req.query.page || "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit || "10"), 10) || 10;
      const data = await getTableDataPaginated(tableName, page, limit);
      res.json({ success: true, ...data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message, columns: [], rows: [], total: 0 });
    }
  });
  const getAuthUserFromRequest = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      return verifyJwtToken(parts[1]);
    }
    return null;
  };
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body || {};
      const appUrl = `${req.protocol}://${req.get("host")}`;
      const result = await registerUser(name, email, password, appUrl);
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const created = all.find((u) => u.id === result.user.id);
        if (created) {
          mysqlUpsertUser(created);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await loginUser(email, password);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { email, code, token } = req.body || {};
      const result = await verifyUserEmail({ email, code, token });
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.id === result.user.id);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body || {};
      const appUrl = `${req.protocol}://${req.get("host")}`;
      const result = await resendVerificationCode(email, appUrl);
      if (result.success) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.email === (email || "").toLowerCase().trim());
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body || {};
      const appUrl = `${req.protocol}://${req.get("host")}`;
      const result = await requestPasswordReset(email, appUrl);
      if (result.success) {
        saveDataToFile();
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code, token } = req.body || {};
      const result = await verifyResetCode({ email, code, token });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, token, newPassword } = req.body || {};
      const result = await resetPasswordWithCodeOrToken({ email, code, token, newPassword });
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.id === result.user.id);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/auth/verify-reset-token", (req, res) => {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ valid: false, message: "Token tidak disediakan." });
    }
    const user = getAllUsers().find((u) => u.resetPasswordToken === token);
    if (!user) {
      return res.status(404).json({ valid: false, message: "Token reset kata sandi tidak ditemukan atau sudah digunakan." });
    }
    if (user.resetPasswordExpiresAt && Date.now() > new Date(user.resetPasswordExpiresAt).getTime()) {
      return res.status(410).json({ valid: false, message: "Token reset kata sandi telah kedaluwarsa." });
    }
    res.json({
      valid: true,
      email: user.email,
      name: user.name
    });
  });
  app.get("/api/auth/me", (req, res) => {
    const payload = getAuthUserFromRequest(req);
    if (!payload) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }
    const user = getAllUsers().find((u) => u.id === payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      user: toSafeUser(user)
    });
  });
  app.put("/api/auth/profile", async (req, res) => {
    try {
      const payload = getAuthUserFromRequest(req);
      if (!payload) {
        return res.status(401).json({ success: false, message: "Sesi Anda telah berakhir. Silakan login kembali." });
      }
      const { name, oldPassword, newPassword } = req.body || {};
      const result = await updateUserProfile(payload.userId, name, oldPassword, newPassword);
      if (result.success && result.user) {
        saveDataToFile();
        const all = getAllUsers();
        const updated = all.find((u) => u.id === payload.userId);
        if (updated) {
          mysqlUpsertUser(updated);
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  });
  app.get("/api/users", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (authUser && authUser.role !== "superadmin" && authUser.role !== "admin") {
      return res.status(403).json({ error: "Akses ditolak: Hanya Admin dan Superadmin yang dapat mengelola pengguna." });
    }
    const safeUsers = getAllUsers().map(toSafeUser);
    res.json(safeUsers);
  });
  app.put("/api/users/:id/role", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !["superadmin", "admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }
    if (authUser && authUser.role !== "superadmin") {
      if (role === "superadmin") {
        return res.status(403).json({ error: "Hanya Superadmin yang dapat menunjuk Superadmin lain." });
      }
      if (authUser.role !== "admin") {
        return res.status(403).json({ error: "Akses ditolak." });
      }
    }
    const all = getAllUsers();
    const user = all.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    user.role = role;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);
    res.json({ success: true, user: toSafeUser(user) });
  });
  app.put("/api/users/:id/status", (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const all = getAllUsers();
    const user = all.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    user.isActive = Boolean(isActive);
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);
    res.json({ success: true, user: toSafeUser(user) });
  });
  app.post("/api/users/:id/verify-manual", (req, res) => {
    const { id } = req.params;
    const all = getAllUsers();
    const user = all.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    user.isVerified = true;
    user.verificationCode = void 0;
    user.verificationToken = void 0;
    user.verificationExpiresAt = void 0;
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertUser(user);
    res.json({ success: true, message: `Akun ${user.name} berhasil diverifikasi manual.`, user: toSafeUser(user) });
  });
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const authUser = getAuthUserFromRequest(req);
      const all = getAllUsers();
      const targetUser = all.find((u) => u.id === id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: "Pengguna tidak ditemukan." });
      }
      if (authUser) {
        if (authUser.userId === id) {
          return res.status(400).json({ success: false, error: "Anda tidak dapat menghapus akun Anda sendiri saat sedang login." });
        }
        if (authUser.role === "admin" && targetUser.role === "superadmin") {
          return res.status(403).json({ success: false, error: "Admin tidak memiliki izin untuk menghapus akun Superadmin." });
        }
        if (authUser.role === "user") {
          return res.status(403).json({ success: false, error: "User biasa tidak memiliki izin untuk mengelola atau menghapus akun." });
        }
      }
      if (targetUser.role === "superadmin") {
        const superCount = all.filter((u) => u.role === "superadmin").length;
        if (superCount <= 1) {
          return res.status(400).json({ success: false, error: "Tidak dapat menghapus satu-satunya akun Superadmin utama." });
        }
      }
      const filtered = all.filter((u) => u.id !== id);
      setAllUsers(filtered);
      saveDataToFile();
      await mysqlDeleteUser(id);
      console.log(`[Users] Akun pengguna "${targetUser.name}" (${targetUser.email}, ${targetUser.role}) berhasil dihapus.`);
      res.json({ success: true, message: `Akun pengguna "${targetUser.name}" (${targetUser.email}) berhasil dihapus.` });
    } catch (err) {
      console.error("[Users] Gagal menghapus pengguna:", err);
      res.status(500).json({ success: false, error: err.message || "Gagal menghapus pengguna." });
    }
  });
  app.get("/api/mail/config", (req, res) => {
    res.json(getSafeMailConfig());
  });
  app.post("/api/mail/accounts", (req, res) => {
    try {
      const { name, gmailUser, gmailAppPassword, fromName, host, port, secure, isActive } = req.body || {};
      if (!gmailUser || !gmailAppPassword) {
        return res.status(400).json({ error: "Alamat Gmail dan Sandi Aplikasi (16-karakter) wajib diisi." });
      }
      const acc = addSmtpAccount({
        name,
        gmailUser,
        gmailAppPassword,
        fromName,
        host,
        port: parseInt(port, 10) || 465,
        secure: secure ?? true,
        isActive: isActive ?? true
      });
      res.json({ success: true, message: "Akun Gmail SMTP berhasil ditambahkan.", account: acc, config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.put("/api/mail/accounts/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, gmailUser, gmailAppPassword, fromName, host, port, secure, isActive, order } = req.body || {};
      const updated = updateSmtpAccount(id, {
        name,
        gmailUser,
        gmailAppPassword,
        fromName,
        host,
        port: port ? parseInt(port, 10) : void 0,
        secure,
        isActive,
        order
      });
      if (!updated) {
        return res.status(404).json({ error: "Akun SMTP tidak ditemukan." });
      }
      res.json({ success: true, message: "Akun Gmail SMTP berhasil diperbarui.", config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.delete("/api/mail/accounts/:id", (req, res) => {
    try {
      const { id } = req.params;
      const deleted = deleteSmtpAccount(id);
      if (!deleted) {
        return res.status(404).json({ error: "Akun SMTP tidak ditemukan." });
      }
      res.json({ success: true, message: "Akun Gmail SMTP berhasil dihapus.", config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/mail/reorder", (req, res) => {
    try {
      const { ids } = req.body || {};
      if (Array.isArray(ids)) {
        reorderSmtpAccounts(ids);
      }
      res.json({ success: true, config: getSafeMailConfig() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/mail/accounts/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const { testEmail } = req.body || {};
      const result = await testSingleSmtpAccount(id, testEmail);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.post("/api/mail/test-all", async (req, res) => {
    try {
      const { testEmail } = req.body || {};
      if (!testEmail) {
        return res.status(400).json({ error: "Email penerima uji coba wajib diisi." });
      }
      const subject = `[Uji Failover Pool] Tes Kirim Server DataForge (${(/* @__PURE__ */ new Date()).toLocaleTimeString("id-ID")})`;
      const text = `Halo,

Ini adalah pengujian failover multi-akun SMTP Gmail DataForge API Studio.
Email berhasil dikirim!

Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="color: #4f46e5; margin-top: 0;">Pengujian Failover Pool Berhasil!</h3>
          <p style="color: #334155; font-size: 13px;">Email ini dikirimkan melalui pengujian pool multi-SMTP Gmail.</p>
          <p style="color: #64748b; font-size: 11px;">Waktu: ${(/* @__PURE__ */ new Date()).toLocaleString("id-ID")}</p>
        </div>
      `;
      const result = await sendEmailWithFailover({ toEmail: testEmail, subject, text, html });
      res.json({
        success: result.sent,
        accountUsed: result.accountUsed,
        attempts: result.attempts,
        message: result.sent ? `Sukses terkirim menggunakan ${result.accountUsed}!` : "Gagal mengirim email: Seluruh akun SMTP dalam pool mengalami kegagalan."
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  app.get("/api/projects", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.json([]);
    }
    if (authUser.role === "superadmin" || authUser.role === "admin") {
      return res.json(projects);
    }
    const userProjects = projects.filter((p) => p.ownerId === authUser.userId);
    res.json(userProjects);
  });
  app.post("/api/projects", (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const { name, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Nama database wajib diisi" });
    }
    const newProject = {
      id: `proj-${Date.now()}`,
      ownerId: authUser ? authUser.userId : "usr-superadmin",
      ownerEmail: authUser ? authUser.email : "superadmin@dataforge.io",
      name: name.trim(),
      description: description ? description.trim() : "",
      token: `sb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      color: color || "indigo",
      icon: icon || "Database",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    projects.unshift(newProject);
    saveDataToFile();
    mysqlUpsertProject(newProject);
    res.json(newProject);
  });
  app.put("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;
    const project = projects.find((p) => p.id === id);
    if (!project) return res.status(404).json({ error: "Database not found" });
    if (name) project.name = name.trim();
    if (description !== void 0) project.description = description.trim();
    if (color) project.color = color;
    if (icon) project.icon = icon;
    project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertProject(project);
    res.json(project);
  });
  app.delete("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    projects = projects.filter((p) => p.id !== id);
    const removedTableIds = tables.filter((t2) => t2.projectId === id).map((t2) => t2.id);
    tables = tables.filter((t2) => t2.projectId !== id);
    records = records.filter((r2) => !removedTableIds.includes(r2.tableId));
    saveDataToFile();
    mysqlDeleteProject(id);
    res.json({ success: true, message: "Database and its tables deleted" });
  });
  const handleRefreshProjectToken = (req, res) => {
    const { id } = req.params;
    const project = projects.find((p) => p.id === id);
    if (!project) return res.status(404).json({ error: "Database tidak ditemukan" });
    const oldToken = project.token;
    project.token = `sb_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    project.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertProject(project);
    res.json({
      success: true,
      message: `Token database "${project.name}" berhasil di-refresh. Token lama telah dicabut.`,
      token: project.token,
      oldToken,
      project
    });
  };
  app.post("/api/projects/:id/regenerate-token", handleRefreshProjectToken);
  app.post("/api/projects/:id/refresh-token", handleRefreshProjectToken);
  app.get("/api/projects/:projectId/tables", (req, res) => {
    const { projectId } = req.params;
    const projectTables = tables.filter((t2) => t2.projectId === projectId);
    res.json(projectTables);
  });
  app.post("/api/projects/:projectId/tables", (req, res) => {
    const { projectId } = req.params;
    const { name, slug, description, fields, apiVisibleFields, apiSearchableFields } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Table name is required" });
    }
    const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
    const exists = tables.some((t2) => t2.projectId === projectId && t2.slug === cleanSlug);
    if (exists) {
      return res.status(400).json({ error: `Table with slug "${cleanSlug}" already exists in this database` });
    }
    let tableFields = Array.isArray(fields) && fields.length > 0 ? fields : [];
    if (!tableFields.some((f3) => f3.key === "id" || f3.isPrimaryKey)) {
      tableFields = [
        { key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true },
        ...tableFields
      ];
    } else {
      tableFields = tableFields.map((f3) => f3.key === "id" ? { ...f3, isPrimaryKey: true, required: true } : f3);
    }
    const newTable = {
      id: `tbl-${Date.now()}`,
      projectId,
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : "",
      primaryKey: "id",
      fields: tableFields,
      apiVisibleFields: Array.isArray(apiVisibleFields) ? apiVisibleFields : [],
      apiSearchableFields: Array.isArray(apiSearchableFields) ? apiSearchableFields : [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    tables.push(newTable);
    saveDataToFile();
    mysqlUpsertTable(newTable);
    res.json(newTable);
  });
  app.put("/api/projects/:projectId/tables/:tableId", (req, res) => {
    const { projectId, tableId } = req.params;
    const { name, slug, description, fields, apiVisibleFields, apiSearchableFields } = req.body;
    const table = tables.find((t2) => t2.id === tableId && t2.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Table not found" });
    if (name) table.name = name.trim();
    if (description !== void 0) table.description = description.trim();
    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
      const collision = tables.some((t2) => t2.projectId === projectId && t2.id !== tableId && t2.slug === cleanSlug);
      if (collision) return res.status(400).json({ error: "Table slug already in use" });
      table.slug = cleanSlug;
    }
    if (Array.isArray(fields)) {
      let updatedFields = [...fields];
      if (!updatedFields.some((f3) => f3.key === "id" || f3.isPrimaryKey)) {
        updatedFields.unshift({ key: "id", label: "ID (PK)", type: "number", required: true, isPrimaryKey: true });
      }
      table.fields = updatedFields;
    }
    if (apiVisibleFields !== void 0) {
      table.apiVisibleFields = Array.isArray(apiVisibleFields) ? apiVisibleFields : [];
    }
    if (apiSearchableFields !== void 0) {
      table.apiSearchableFields = Array.isArray(apiSearchableFields) ? apiSearchableFields : [];
    }
    table.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertTable(table);
    res.json(table);
  });
  app.delete("/api/projects/:projectId/tables/:tableId", (req, res) => {
    const { projectId, tableId } = req.params;
    tables = tables.filter((t2) => !(t2.id === tableId && t2.projectId === projectId));
    records = records.filter((r2) => r2.tableId !== tableId);
    saveDataToFile();
    mysqlDeleteTable(tableId);
    res.json({ success: true, message: "Table and its records deleted" });
  });
  app.post("/api/projects/:projectId/tables/:tableId/refresh-token", (req, res) => {
    const { projectId, tableId } = req.params;
    const table = tables.find((t2) => t2.id === tableId && t2.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    const oldToken = table.token;
    table.token = `sb_tbl_${table.slug}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    table.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertTable(table);
    res.json({
      success: true,
      message: `Token khusus tabel "${table.name}" berhasil di-refresh. Token lama telah dicabut.`,
      token: table.token,
      oldToken,
      table
    });
  });
  app.delete("/api/projects/:projectId/tables/:tableId/token", (req, res) => {
    const { projectId, tableId } = req.params;
    const table = tables.find((t2) => t2.id === tableId && t2.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    delete table.token;
    table.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertTable(table);
    res.json({
      success: true,
      message: `Token khusus tabel "${table.name}" dicabut. Tabel kini kembali menggunakan Token Master Database.`,
      table
    });
  });
  function validateSelectFieldValues(table, payload) {
    if (!table || !table.fields) return null;
    for (const field of table.fields) {
      if (field.type === "select" && Array.isArray(field.options) && field.options.length > 0) {
        const val = payload[field.key];
        if (val !== void 0 && val !== null && String(val).trim() !== "") {
          const strVal = String(val).trim();
          const exists = field.options.some((opt) => String(opt).trim() === strVal);
          if (!exists) {
            const allowedOpts = field.options.map((o) => `'${o}'`).join(", ");
            return `Nilai '${strVal}' pada kolom '${field.label}' (${field.key}) tidak valid (harus sama persis termasuk huruf besar/kecil). Opsi yang diperbolehkan hanya: [${allowedOpts}]`;
          }
        }
      }
    }
    return null;
  }
  app.get("/api/projects/:projectId/tables/:tableId/records", (req, res) => {
    const { projectId, tableId } = req.params;
    const { search, sort, order } = req.query;
    let tableRecords = records.filter((r2) => r2.projectId === projectId && r2.tableId === tableId);
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      tableRecords = tableRecords.filter((r2) => {
        if (String(r2.id).toLowerCase().includes(q)) return true;
        return Object.values(r2.data).some((val) => String(val || "").toLowerCase().includes(q));
      });
    }
    if (sort && typeof sort === "string") {
      tableRecords.sort((a, b) => {
        const valA = sort === "id" ? a.id : a.data[sort];
        const valB = sort === "id" ? b.id : b.data[sort];
        if (valA === valB) return 0;
        const result = valA > valB ? 1 : -1;
        return order === "desc" ? -result : result;
      });
    } else {
      tableRecords.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }
    res.json(tableRecords);
  });
  app.post("/api/projects/:projectId/tables/:tableId/records", (req, res) => {
    const { projectId, tableId } = req.params;
    const inputData = req.body || {};
    const table = tables.find((t2) => t2.id === tableId && t2.projectId === projectId);
    if (!table) return res.status(404).json({ error: "Table not found" });
    const selectError = validateSelectFieldValues(table, inputData);
    if (selectError) {
      return res.status(400).json({ error: selectError });
    }
    const primaryKeyId = getNextRecordId(tableId);
    const recordData = {
      ...inputData,
      id: primaryKeyId
    };
    const newRecord = {
      id: primaryKeyId,
      tableId,
      projectId,
      data: recordData,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    records.push(newRecord);
    saveDataToFile();
    mysqlUpsertRecord(newRecord);
    res.status(201).json(newRecord);
  });
  app.put("/api/projects/:projectId/tables/:tableId/records/:recordId", (req, res) => {
    const { projectId, tableId, recordId } = req.params;
    const inputData = req.body || {};
    const record = records.find(
      (r2) => r2.projectId === projectId && r2.tableId === tableId && String(r2.id) === String(recordId)
    );
    if (!record) return res.status(404).json({ error: "Record not found" });
    const table = tables.find((t2) => t2.id === tableId && t2.projectId === projectId);
    if (table) {
      const selectError = validateSelectFieldValues(table, inputData);
      if (selectError) {
        return res.status(400).json({ error: selectError });
      }
    }
    record.data = {
      ...record.data,
      ...inputData,
      id: record.id
    };
    record.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertRecord(record);
    res.json(record);
  });
  app.delete("/api/projects/:projectId/tables/:tableId/records/:recordId", (req, res) => {
    const { projectId, tableId, recordId } = req.params;
    records = records.filter(
      (r2) => !(r2.projectId === projectId && r2.tableId === tableId && String(r2.id) === String(recordId))
    );
    saveDataToFile();
    mysqlDeleteRecord(tableId, recordId);
    res.json({ success: true, message: "Record deleted" });
  });
  const authenticateToken = (req, res, next) => {
    let token;
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }
    if (!token && req.headers["x-api-key"]) {
      token = String(req.headers["x-api-key"]).trim();
    }
    if (!token && req.headers["x-token"]) {
      token = String(req.headers["x-token"]).trim();
    }
    if (!token && req.params.token && (String(req.params.token).startsWith("sb_live_") || String(req.params.token).startsWith("sb_tbl_"))) {
      token = String(req.params.token).trim();
    }
    if (!token && req.params.param1 && (String(req.params.param1).startsWith("sb_live_") || String(req.params.param1).startsWith("sb_tbl_"))) {
      token = String(req.params.param1).trim();
    }
    if (!token && (req.query.token || req.query.api_key)) {
      token = String(req.query.token || req.query.api_key).trim();
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: API Token tidak ditemukan.",
        hint: 'Kirim token aman via Header "Authorization: Bearer <API_TOKEN>" atau "X-API-Key: <API_TOKEN>". Hindari menaruh token di URL agar tidak terekam log jaringan WiFi / proxy.'
      });
    }
    const proj = projects.find((p) => p.token === token);
    const tableWithToken = tables.find((t2) => t2.token === token);
    if (!proj && !tableWithToken) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: API Token tidak valid atau telah dicabut (di-refresh)."
      });
    }
    if (proj) {
      req.project = proj;
      req.isMasterToken = true;
    } else if (tableWithToken) {
      const parentProj = projects.find((p) => p.id === tableWithToken.projectId);
      if (!parentProj) {
        return res.status(404).json({ success: false, error: "Database induk tabel tidak ditemukan" });
      }
      req.project = parentProj;
      req.scopedTable = tableWithToken;
      req.isTableToken = true;
    }
    next();
  };
  const resolveTarget = (req) => {
    let tableSlug = req.params.tableSlug;
    let id = req.params.id || req.body?.id || req.query?.id;
    if (!tableSlug && req.params.param1) {
      if (String(req.params.param1).startsWith("sb_live_") || String(req.params.param1).startsWith("sb_tbl_")) {
        tableSlug = req.params.param2;
        if (!id && req.params.param3) id = req.params.param3;
      } else {
        tableSlug = req.params.param1;
        if (!id && req.params.param2) id = req.params.param2;
      }
    }
    return {
      tableSlug: tableSlug ? String(tableSlug).trim() : "",
      id: id !== void 0 && id !== null ? String(id).trim() : ""
    };
  };
  const handleGetSchema = (req, res) => {
    const proj = req.project;
    let projTables = tables.filter((t2) => t2.projectId === proj.id);
    if (req.scopedTable) {
      projTables = projTables.filter((t2) => t2.id === req.scopedTable.id);
    }
    res.json({
      success: true,
      database: {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        totalTables: projTables.length,
        tokenScope: req.scopedTable ? `Tabel Khusus: ${req.scopedTable.name}` : "Master Database Token",
        security: {
          recommendedAuth: 'Header "Authorization: Bearer <API_TOKEN>" (Paling Aman)',
          alternativeAuth: 'Header "X-API-Key: <API_TOKEN>"'
        },
        tables: projTables.map((t2) => ({
          id: t2.id,
          name: t2.name,
          slug: t2.slug,
          primaryKey: t2.primaryKey || "id",
          cleanEndpoint: `/api/v1/${t2.slug}`,
          legacyEndpoint: `/api/v1/${t2.token || proj.token}/${t2.slug}`,
          hasDedicatedToken: !!t2.token,
          fields: t2.fields,
          totalRecords: records.filter((r2) => r2.tableId === t2.id).length
        }))
      }
    });
  };
  const handleGetTableOrItem = (req, res) => {
    const proj = req.project;
    const { tableSlug, id } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    const table = tables.find((t2) => t2.projectId === proj.id && t2.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({
        success: false,
        error: `Tabel "${tableSlug}" tidak ditemukan di database "${proj.name}"`
      });
    }
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan mengakses tabel "${tableSlug}".`
      });
    }
    if (id) {
      const record = records.find((r2) => r2.tableId === table.id && String(r2.id) === String(id));
      if (!record) {
        return res.status(404).json({
          success: false,
          error: `Record dengan primary key #${id} tidak ditemukan di tabel "${tableSlug}"`
        });
      }
      let filteredData = { ...record.data };
      if (Array.isArray(table.apiVisibleFields) && table.apiVisibleFields.length > 0) {
        const allowed = /* @__PURE__ */ new Set(["id", ...table.apiVisibleFields]);
        const cleaned = {};
        Object.keys(filteredData).forEach((k) => {
          if (allowed.has(k)) {
            cleaned[k] = filteredData[k];
          }
        });
        filteredData = cleaned;
      }
      return res.json({
        success: true,
        table: table.slug,
        data: {
          ...filteredData,
          _created_at: record.createdAt,
          _updated_at: record.updatedAt
        }
      });
    }
    let tableRecords = records.filter((r2) => r2.tableId === table.id);
    const { search, limit, offset, sort, order, ...fieldFilters } = req.query;
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      const searchable = Array.isArray(table.apiSearchableFields) && table.apiSearchableFields.length > 0 ? table.apiSearchableFields : null;
      tableRecords = tableRecords.filter((r2) => {
        if (String(r2.id).toLowerCase().includes(q)) return true;
        if (searchable) {
          return searchable.some((fieldKey) => {
            const val = r2.data[fieldKey];
            return String(val || "").toLowerCase().includes(q);
          });
        } else {
          return Object.values(r2.data).some((v) => String(v || "").toLowerCase().includes(q));
        }
      });
    }
    Object.entries(fieldFilters).forEach(([filterKey, filterVal]) => {
      if (filterVal !== void 0) {
        tableRecords = tableRecords.filter((r2) => {
          const val = r2.data[filterKey];
          return String(val).toLowerCase() === String(filterVal).toLowerCase();
        });
      }
    });
    if (sort && typeof sort === "string") {
      tableRecords.sort((a, b) => {
        const valA = sort === "id" ? a.id : a.data[sort];
        const valB = sort === "id" ? b.id : b.data[sort];
        if (valA === valB) return 0;
        const result = valA > valB ? 1 : -1;
        return order === "desc" ? -result : result;
      });
    } else {
      tableRecords.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    }
    const total = tableRecords.length;
    const numLimit = limit ? parseInt(String(limit), 10) : void 0;
    const numOffset = offset ? parseInt(String(offset), 10) : 0;
    if (numLimit && !isNaN(numLimit)) {
      tableRecords = tableRecords.slice(numOffset, numOffset + numLimit);
    }
    const data = tableRecords.map((r2) => {
      let itemData = { ...r2.data };
      if (Array.isArray(table.apiVisibleFields) && table.apiVisibleFields.length > 0) {
        const allowed = /* @__PURE__ */ new Set(["id", ...table.apiVisibleFields]);
        const cleaned = {};
        Object.keys(itemData).forEach((k) => {
          if (allowed.has(k)) {
            cleaned[k] = itemData[k];
          }
        });
        itemData = cleaned;
      }
      return {
        ...itemData,
        _created_at: r2.createdAt,
        _updated_at: r2.updatedAt
      };
    });
    res.json({
      success: true,
      table: table.slug,
      primaryKey: table.primaryKey || "id",
      total,
      count: data.length,
      data
    });
  };
  const handlePostRecord = (req, res) => {
    const proj = req.project;
    const { tableSlug } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    let payload = req.body || {};
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e2) {
        return res.status(400).json({ success: false, error: "Format JSON body tidak valid" });
      }
    }
    const table = tables.find((t2) => t2.projectId === proj.id && t2.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan membuat data di tabel "${tableSlug}".`
      });
    }
    const missingFields = [];
    table.fields.forEach((f3) => {
      if (f3.required && !f3.isPrimaryKey && f3.key !== "id" && (payload[f3.key] === void 0 || payload[f3.key] === null || payload[f3.key] === "")) {
        missingFields.push(f3.key);
      }
    });
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Kolom wajib diisi belum lengkap: ${missingFields.join(", ")}`
      });
    }
    const selectError = validateSelectFieldValues(table, payload);
    if (selectError) {
      return res.status(400).json({
        success: false,
        error: selectError
      });
    }
    const primaryKeyId = getNextRecordId(table.id);
    const recordData = {
      ...payload,
      id: primaryKeyId
    };
    const newRecord = {
      id: primaryKeyId,
      tableId: table.id,
      projectId: proj.id,
      data: recordData,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    records.push(newRecord);
    saveDataToFile();
    mysqlUpsertRecord(newRecord);
    res.status(201).json({
      success: true,
      message: `Record dengan Primary Key #${primaryKeyId} berhasil dibuat di tabel "${table.slug}"`,
      data: {
        id: primaryKeyId,
        ...recordData,
        _created_at: newRecord.createdAt
      }
    });
  };
  const handlePutRecord = (req, res) => {
    const proj = req.project;
    const { tableSlug, id: targetId } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    let payload = req.body || {};
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e2) {
        return res.status(400).json({ success: false, error: "Format JSON body tidak valid" });
      }
    }
    const table = tables.find((t2) => t2.projectId === proj.id && t2.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan mengubah data di tabel "${tableSlug}".`
      });
    }
    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: `Parameter ID primary key wajib disertakan. Contoh: PUT /api/v1/${table.slug}/1 atau sertakan {"id": 1} di request body.`
      });
    }
    const record = records.find((r2) => r2.tableId === table.id && String(r2.id) === String(targetId));
    if (!record) {
      return res.status(404).json({
        success: false,
        error: `Record dengan primary key #${targetId} tidak ditemukan di tabel "${tableSlug}"`
      });
    }
    const selectError = validateSelectFieldValues(table, payload);
    if (selectError) {
      return res.status(400).json({
        success: false,
        error: selectError
      });
    }
    record.data = {
      ...record.data,
      ...payload,
      id: record.id
    };
    record.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDataToFile();
    mysqlUpsertRecord(record);
    res.json({
      success: true,
      message: `Record #${record.id} berhasil diperbarui di tabel "${table.slug}"`,
      data: {
        id: record.id,
        ...record.data,
        _updated_at: record.updatedAt
      }
    });
  };
  const handleDeleteRecord = (req, res) => {
    const proj = req.project;
    const { tableSlug, id: targetId } = resolveTarget(req);
    if (!tableSlug) {
      return res.status(400).json({ success: false, error: "Nama tabel (slug) wajib disertakan" });
    }
    const table = tables.find((t2) => t2.projectId === proj.id && t2.slug.toLowerCase() === tableSlug.toLowerCase());
    if (!table) {
      return res.status(404).json({ success: false, error: `Tabel "${tableSlug}" tidak ditemukan` });
    }
    if (req.scopedTable && req.scopedTable.id !== table.id) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Token ini khusus untuk tabel "${req.scopedTable.name}" dan tidak diizinkan menghapus data di tabel "${tableSlug}".`
      });
    }
    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: `Parameter ID primary key wajib disertakan. Contoh: DELETE /api/v1/${table.slug}/1 atau sertakan ?id=1 di URL.`
      });
    }
    const index = records.findIndex((r2) => r2.tableId === table.id && String(r2.id) === String(targetId));
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Record dengan primary key #${targetId} tidak ditemukan di tabel "${tableSlug}"`
      });
    }
    const deleted = records.splice(index, 1)[0];
    saveDataToFile();
    mysqlDeleteRecord(table.id, targetId);
    res.json({
      success: true,
      message: `Record #${targetId} berhasil dihapus dari tabel "${table.slug}"`,
      deletedRecord: {
        id: deleted.id,
        ...deleted.data
      }
    });
  };
  app.get("/api/v1/schema", authenticateToken, handleGetSchema);
  app.get("/api/v1/:param1/schema", authenticateToken, handleGetSchema);
  app.get("/api/v1/:param1", authenticateToken, handleGetTableOrItem);
  app.get("/api/v1/:param1/:param2", authenticateToken, handleGetTableOrItem);
  app.get("/api/v1/:param1/:param2/:param3", authenticateToken, handleGetTableOrItem);
  app.post("/api/v1/:param1", authenticateToken, handlePostRecord);
  app.post("/api/v1/:param1/:param2", authenticateToken, handlePostRecord);
  app.post("/api/v1/:param1/:param2/:param3", authenticateToken, handlePostRecord);
  app.put("/api/v1/:param1", authenticateToken, handlePutRecord);
  app.put("/api/v1/:param1/:param2", authenticateToken, handlePutRecord);
  app.put("/api/v1/:param1/:param2/:param3", authenticateToken, handlePutRecord);
  app.delete("/api/v1/:param1", authenticateToken, handleDeleteRecord);
  app.delete("/api/v1/:param1/:param2", authenticateToken, handleDeleteRecord);
  app.delete("/api/v1/:param1/:param2/:param3", authenticateToken, handleDeleteRecord);
  const vite = await (0, import_vite.createServer)({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Visual Database Engine & API] Server running on http://localhost:${PORT}`);
  });
}
startServer();
/*! Bundled license information:

web-streams-polyfill/dist/ponyfill.es2018.js:
  (**
   * @license
   * web-streams-polyfill v3.3.3
   * Copyright 2024 Mattias Buelens, Diwank Singh Tomer and other contributors.
   * This code is released under the MIT license.
   * SPDX-License-Identifier: MIT
   *)

fetch-blob/index.js:
  (*! fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> *)

formdata-polyfill/esm.min.js:
  (*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> *)

node-domexception/index.js:
  (*! node-domexception. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> *)
*/
