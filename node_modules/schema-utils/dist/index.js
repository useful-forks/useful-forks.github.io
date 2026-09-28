"use strict";

/** @typedef {import("./validate").Schema} Schema */
/** @typedef {import("./validate").JSONSchema4} JSONSchema4 */
/** @typedef {import("./validate").JSONSchema6} JSONSchema6 */
/** @typedef {import("./validate").JSONSchema7} JSONSchema7 */
/** @typedef {import("./validate").ExtendedSchema} ExtendedSchema */
/** @typedef {import("./validate").ValidationErrorConfiguration} ValidationErrorConfiguration */

const {
  ValidationError,
  disableValidation,
  enableValidation,
  needValidate,
  validate
} = require("./validate");
module.exports = {
  ValidationError,
  disableValidation,
  enableValidation,
  needValidate,
  validate
};