"use strict";

const CAMEL_CASE_REGEXP = /([^A-Z])([A-Z])/g;
const LEADING_UNDERSCORE_REGEXP = /^_/;

/**
 * Turns the name of a format into words, so `dash-case`, `snake_case`,
 * `camelCase` and `PascalCase` all read as `dash case`, `snake case`, and so on.
 * @param {string} str provided string
 * @returns {string} the string as human readable words
 */
module.exports = function humanize(str) {
  if (str.length < 2) {
    return str;
  }
  if (str.includes("-")) {
    return str.split("-").join(" ").toLowerCase();
  }

  // A leading underscore is not a word boundary, `_12Integers` is `12 integers`
  const withoutLeadingUnderscore = str.replace(LEADING_UNDERSCORE_REGEXP, "");
  if (withoutLeadingUnderscore.includes("_")) {
    return withoutLeadingUnderscore.split("_").join(" ").toLowerCase();
  }
  return withoutLeadingUnderscore.replace(CAMEL_CASE_REGEXP, "$1 $2").toLowerCase();
};