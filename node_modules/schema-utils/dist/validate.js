"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ValidationError", {
  enumerable: true,
  get: function () {
    return _ValidationError.default;
  }
});
exports.disableValidation = disableValidation;
exports.enableValidation = enableValidation;
exports.needValidate = needValidate;
exports.validate = validate;
var _ValidationError = _interopRequireDefault(require("./ValidationError"));
var _memorize = _interopRequireDefault(require("./util/memorize"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const getAjv = (0, _memorize.default)(() => {
  // Use CommonJS require for ajv libs so TypeScript consumers aren't locked into esModuleInterop (see #110).

  const Ajv = require("ajv").default;
  const ajvKeywords = require("ajv-keywords").default;
  const addFormats = require("ajv-formats").default;

  /**
   * @type {Ajv}
   */
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    verbose: true,
    $data: true
  });
  ajvKeywords(ajv, ["instanceof", "patternRequired"]);
  // TODO set `{ keywords: true }` for the next major release and remove `keywords/limit.js`
  addFormats(ajv, {
    keywords: false
  });

  // Custom keywords

  const addAbsolutePathKeyword = require("./keywords/absolutePath").default;
  addAbsolutePathKeyword(ajv);
  const addLimitKeyword = require("./keywords/limit").default;
  addLimitKeyword(ajv);
  const addUndefinedAsNullKeyword = require("./keywords/undefinedAsNull").default;
  addUndefinedAsNullKeyword(ajv);
  return ajv;
});

/** @typedef {import("json-schema").JSONSchema4} JSONSchema4 */
/** @typedef {import("json-schema").JSONSchema6} JSONSchema6 */
/** @typedef {import("json-schema").JSONSchema7} JSONSchema7 */
/** @typedef {import("ajv").ErrorObject} ErrorObject */

/**
 * @typedef {object} ExtendedSchema
 * @property {(string | number)=} formatMinimum format minimum
 * @property {(string | number)=} formatMaximum format maximum
 * @property {(string | boolean)=} formatExclusiveMinimum format exclusive minimum
 * @property {(string | boolean)=} formatExclusiveMaximum format exclusive maximum
 * @property {string=} link link
 * @property {boolean=} undefinedAsNull undefined will be resolved as null
 * @property {boolean=} absolutePath the string is an absolute path when true, a relative one when false
 */

// TODO remove me in the next major release
/** @typedef {ExtendedSchema} Extend */

/** @typedef {(JSONSchema4 | JSONSchema6 | JSONSchema7) & ExtendedSchema} Schema */

/** @typedef {ErrorObject & { children?: ErrorObject[] }} SchemaUtilErrorObject */

/**
 * @callback PostFormatter
 * @param {string} formattedError
 * @param {SchemaUtilErrorObject} error
 * @returns {string}
 */

/**
 * @typedef {object} ValidationErrorConfiguration
 * @property {string=} name name
 * @property {string=} baseDataPath base data path
 * @property {PostFormatter=} postFormatter post formatter
 */

/**
 * @param {SchemaUtilErrorObject} error error
 * @param {number} idx idx
 * @returns {SchemaUtilErrorObject} error object with idx
 */
function applyPrefix(error, idx) {
  error.instancePath = `[${idx}]${error.instancePath}`;
  if (error.children) {
    for (const err of error.children) applyPrefix(err, idx);
  }
  return error;
}
const IS_TRUTHY = /^(?:y|yes|true|1|on)$/i;
const IS_FALSY = /^(?:n|no|false|0|off)$/i;

/**
 * @returns {boolean} true when `process.env.SKIP_VALIDATION` asks to skip validation
 */
function skipValidationFromEnv() {
  const value = process && process.env ? process.env.SKIP_VALIDATION : undefined;
  if (value) {
    const trimmedValue = value.trim();
    if (IS_TRUTHY.test(trimmedValue)) {
      return true;
    }
    if (IS_FALSY.test(trimmedValue)) {
      return false;
    }
  }
  return false;
}

/**
 * Whether validation is skipped, shared by every `schema-utils` in the process.
 * @typedef {object} SkipValidationState
 * @property {boolean} skip true when validation is disabled
 */

const SKIP_VALIDATION_KEY = Symbol.for("schema-utils/skipValidation");
const globalObject = /** @type {Record<symbol, SkipValidationState | undefined>} */

/** @type {unknown} */
// eslint-disable-next-line no-undef
typeof globalThis === "undefined" ? global : globalThis;

// `process.env.SKIP_VALIDATION` is read when this module is loaded, not on every validation -
// reading a variable from `process.env` costs about 250ns, which is most of the time a successful
// validation takes. Later changes go through `enableValidation`/`disableValidation`, which share
// the resolved state through the global object so that `schema-utils` copies of different
// versions still turn each other on and off, and keep writing `process.env` for copies too old
// to know about the shared state.
const sharedState = globalObject[SKIP_VALIDATION_KEY] || (globalObject[SKIP_VALIDATION_KEY] = {
  skip: false
});
sharedState.skip = skipValidationFromEnv();

// Enable validation
/**
 * @returns {void}
 */
function enableValidation() {
  sharedState.skip = false;

  // Enable validation for any versions
  if (process && process.env) {
    process.env.SKIP_VALIDATION = "n";
  }
}

// Disable validation
/**
 * @returns {void}
 */
function disableValidation() {
  sharedState.skip = true;
  if (process && process.env) {
    process.env.SKIP_VALIDATION = "y";
  }
}

// Check if we need to confirm
/**
 * @returns {boolean} true when need validate, otherwise false
 */
function needValidate() {
  return !sharedState.skip;
}

/**
 * A node of the prefix tree used by `filterErrors` to look up already reported errors by their
 * instance path.
 * @typedef {object} ErrorPathNode
 * @property {number[]} indexes positions (in the result array) of the errors reported for exactly this instance path
 * @property {Map<string, ErrorPathNode> | undefined} children nodes of nested instance paths, keyed by json pointer segment, created on demand
 * @property {number} size amount of errors stored in this node and in all its descendants
 */

/**
 * @returns {ErrorPathNode} empty node
 */
function createErrorPathNode() {
  return {
    indexes: [],
    children: undefined,
    size: 0
  };
}

/**
 * Splits an instance path (a json pointer) into its segments, i.e. `"/rules/0"` into `["rules", "0"]`.
 * @param {string} instancePath instance path
 * @returns {string[]} json pointer segments
 */
function parseInstancePath(instancePath) {
  // A json pointer is either empty or starts with a separator, so the leading separator is dropped
  // instead of splitting off an empty first segment
  return instancePath === "" ? [] : instancePath.slice(1).split("/");
}

/**
 * @param {number} a a
 * @param {number} b b
 * @returns {number} comparison result
 */
function compareNumbers(a, b) {
  return a - b;
}

/**
 * Stores an error at the given instance path and removes every error already stored for that path
 * or for anything nested inside it, since those become children of the new one.
 *
 * The new error keeps the node non empty, so no node ever has to be pruned.
 * @param {ErrorPathNode} root root node
 * @param {string[]} segments json pointer segments of the error instance path
 * @param {number} index position of the error in the result array
 * @returns {number[]} positions (in the result array) of the removed errors, in the order they were reported
 */
function replaceErrorPath(root, segments, index) {
  /** @type {ErrorPathNode[]} */
  const ancestors = [];
  /** @type {number[]} */
  const indexes = [];
  let node = root;
  let depth = 0;

  // A single walk down, creating the missing nodes on the way
  for (const segment of segments) {
    ancestors[depth] = node;
    depth += 1;
    let {
      children
    } = node;
    if (!children) {
      children = new Map();
      node.children = children;
    }
    let child = children.get(segment);
    if (!child) {
      child = createErrorPathNode();
      children.set(segment, child);
    }
    node = child;
  }
  if (node.size > 0) {
    /** @type {ErrorPathNode[]} */
    const stack = [node];
    while (stack.length > 0) {
      const current = /** @type {ErrorPathNode} */stack.pop();
      for (const collected of current.indexes) {
        indexes.push(collected);
      }
      if (current.children) {
        for (const child of current.children.values()) {
          stack.push(child);
        }
      }
    }

    // The subtree has been consumed, so detach it
    node.children = undefined;
    indexes.sort(compareNumbers);
  }
  node.indexes = [index];
  const delta = 1 - node.size;
  node.size = 1;
  for (let i = 0; i < depth; i++) {
    ancestors[i].size += delta;
  }
  return indexes;
}

/**
 * Moves an already reported error under `children`, hoisting the children it collected itself.
 * @param {SchemaUtilErrorObject[]} children collected children
 * @param {SchemaUtilErrorObject} oldError error to nest
 * @returns {SchemaUtilErrorObject[]} collected children, which may be a different array
 */
function absorbError(children, oldError) {
  let newChildren = children;
  if (oldError.children) {
    if (newChildren.length === 0) {
      // Adopt the array instead of copying it - a long run of sibling errors re-parents the
      // previously collected children on every step, so copying them would be quadratic
      newChildren = oldError.children;
    } else {
      for (const child of oldError.children) {
        newChildren.push(child);
      }
    }
  }
  oldError.children = undefined;
  newChildren.push(oldError);
  return newChildren;
}

/**
 * Whether an instance path points at `ancestorPath` itself or at something nested inside it, i.e.
 * `"/rules/0"` is inside `"/rules"` but `"/rulesets"` is not.
 * @param {string} instancePath instance path
 * @param {string} ancestorPath ancestor instance path
 * @returns {boolean} true when at or below the ancestor path, otherwise false
 */
function isAtOrBelow(instancePath, ancestorPath) {
  if (instancePath.length === ancestorPath.length) {
    return instancePath === ancestorPath;
  }
  return instancePath.length > ancestorPath.length &&
  // the next character has to be a separator, otherwise it is a sibling with a longer name
  instancePath.charCodeAt(ancestorPath.length) === 47 /* / */ && instancePath.startsWith(ancestorPath);
}

// Below this amount of errors scanning the collected errors directly is cheaper than indexing
// them, above it the index is what keeps the whole thing from going quadratic
const MAX_SCANNED_ERRORS = 24;

/**
 * Same as `filterErrors`, without the instance path index - for a small amount of errors walking
 * the collected errors is cheaper than building one.
 * @param {SchemaUtilErrorObject[]} errors array of error objects
 * @returns {SchemaUtilErrorObject[]} filtered array of objects
 */
function scanErrors(errors) {
  /** @type {SchemaUtilErrorObject[]} */
  const newErrors = [];
  for (const error of errors) {
    const {
      instancePath
    } = error;
    /** @type {SchemaUtilErrorObject[]} */
    let children = [];
    let kept = 0;
    for (let i = 0; i < newErrors.length; i++) {
      const oldError = newErrors[i];
      if (!isAtOrBelow(oldError.instancePath, instancePath)) {
        newErrors[kept] = oldError;
        kept += 1;
        continue;
      }
      children = absorbError(children, oldError);
    }
    newErrors.length = kept;
    if (children.length) {
      error.children = children;
    }
    newErrors.push(error);
  }
  return newErrors;
}

/**
 * Nests every error under the last reported error that covers its instance path, so that only the
 * outermost errors are left at the top level.
 * @param {ErrorObject[]} errors array of error objects
 * @returns {SchemaUtilErrorObject[]} filtered array of objects
 */
function filterErrors(errors) {
  if (errors.length <= MAX_SCANNED_ERRORS) {
    return scanErrors(/** @type {SchemaUtilErrorObject[]} */errors);
  }

  /** @type {(SchemaUtilErrorObject | undefined)[]} */
  const newErrors = [];
  const root = createErrorPathNode();
  let lastInstancePath;
  /** @type {string[]} */
  let segments = [];
  for (const error of (/** @type {SchemaUtilErrorObject[]} */errors)) {
    const {
      instancePath
    } = error;

    // Errors reported next to each other usually share the instance path, i.e. the branches of an
    // `anyOf`, so the split is worth reusing
    if (instancePath !== lastInstancePath) {
      lastInstancePath = instancePath;
      segments = parseInstancePath(instancePath);
    }

    /** @type {SchemaUtilErrorObject[]} */
    let children = [];
    for (const index of replaceErrorPath(root, segments, newErrors.length)) {
      const oldError = /** @type {SchemaUtilErrorObject} */newErrors[index];
      newErrors[index] = undefined;
      children = absorbError(children, oldError);
    }
    if (children.length) {
      error.children = children;
    }
    newErrors.push(error);
  }
  return /** @type {SchemaUtilErrorObject[]} */newErrors.filter(error => typeof error !== "undefined");
}

/**
 * @param {Schema} schema schema
 * @param {object[] | object} options options
 * @returns {SchemaUtilErrorObject[]} array of error objects
 */
function validateObject(schema, options) {
  // Not need to cache, because `ajv@8` has built-in cache
  const compiledSchema = getAjv().compile(schema);
  const valid = compiledSchema(options);
  if (valid) return [];
  return compiledSchema.errors ? filterErrors(compiledSchema.errors) : [];
}

/**
 * @param {Schema} schema schema
 * @param {object[] | object} options options
 * @param {ValidationErrorConfiguration=} configuration configuration
 * @returns {void}
 */
function validate(schema, options, configuration) {
  if (!needValidate()) {
    return;
  }
  let errors = [];
  if (Array.isArray(options)) {
    for (let i = 0; i <= options.length - 1; i++) {
      // Not `errors.push(...)`, a large amount of errors would overflow the call stack
      for (const error of validateObject(schema, options[i])) {
        errors.push(applyPrefix(error, i));
      }
    }
  } else {
    errors = validateObject(schema, options);
  }
  if (errors.length > 0) {
    throw new _ValidationError.default(errors, schema, configuration);
  }
}