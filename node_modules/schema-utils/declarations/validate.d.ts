export { default as ValidationError } from "./ValidationError";
export type JSONSchema4 = import("json-schema").JSONSchema4;
export type JSONSchema6 = import("json-schema").JSONSchema6;
export type JSONSchema7 = import("json-schema").JSONSchema7;
export type ErrorObject = import("ajv").ErrorObject;
export type ExtendedSchema = {
  /**
   * format minimum
   */
  formatMinimum?: (string | number) | undefined;
  /**
   * format maximum
   */
  formatMaximum?: (string | number) | undefined;
  /**
   * format exclusive minimum
   */
  formatExclusiveMinimum?: (string | boolean) | undefined;
  /**
   * format exclusive maximum
   */
  formatExclusiveMaximum?: (string | boolean) | undefined;
  /**
   * link
   */
  link?: string | undefined;
  /**
   * undefined will be resolved as null
   */
  undefinedAsNull?: boolean | undefined;
  /**
   * the string is an absolute path when true, a relative one when false
   */
  absolutePath?: boolean | undefined;
};
export type Extend = ExtendedSchema;
export type Schema = (JSONSchema4 | JSONSchema6 | JSONSchema7) & ExtendedSchema;
export type SchemaUtilErrorObject = ErrorObject & {
  children?: ErrorObject[];
};
export type PostFormatter = (
  formattedError: string,
  error: SchemaUtilErrorObject,
) => string;
export type ValidationErrorConfiguration = {
  /**
   * name
   */
  name?: string | undefined;
  /**
   * base data path
   */
  baseDataPath?: string | undefined;
  /**
   * post formatter
   */
  postFormatter?: PostFormatter | undefined;
};
/**
 * A node of the prefix tree used by `filterErrors` to look up already reported errors by their
 * instance path.
 */
export type ErrorPathNode = {
  /**
   * positions (in the result array) of the errors reported for exactly this instance path
   */
  indexes: number[];
  /**
   * nodes of nested instance paths, keyed by json pointer segment, created on demand
   */
  children: Map<string, ErrorPathNode> | undefined;
  /**
   * amount of errors stored in this node and in all its descendants
   */
  size: number;
};
/**
 * Whether validation is skipped, shared by every `schema-utils` in the process.
 */
export type SkipValidationState = {
  /**
   * true when validation is disabled
   */
  skip: boolean;
};
/**
 * @returns {void}
 */
export function disableValidation(): void;
/**
 * @returns {void}
 */
export function enableValidation(): void;
/**
 * @returns {boolean} true when need validate, otherwise false
 */
export function needValidate(): boolean;
/**
 * @param {Schema} schema schema
 * @param {object[] | object} options options
 * @param {ValidationErrorConfiguration=} configuration configuration
 * @returns {void}
 */
export function validate(
  schema: Schema,
  options: object[] | object,
  configuration?: ValidationErrorConfiguration | undefined,
): void;
