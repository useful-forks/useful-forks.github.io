export default ValidationError;
export type JSONSchema6 = import("json-schema").JSONSchema6;
export type JSONSchema7 = import("json-schema").JSONSchema7;
export type Schema = import("./validate").Schema;
export type ValidationErrorConfiguration =
  import("./validate").ValidationErrorConfiguration;
export type PostFormatter = import("./validate").PostFormatter;
export type SchemaUtilErrorObject = import("./validate").SchemaUtilErrorObject;
export type EXPECTED_ANY = any;
declare class ValidationError extends Error {
  /**
   * @param {SchemaUtilErrorObject[]} errors array of error objects
   * @param {Schema} schema schema
   * @param {ValidationErrorConfiguration} configuration configuration
   */
  constructor(
    errors: SchemaUtilErrorObject[],
    schema: Schema,
    configuration?: ValidationErrorConfiguration,
  );
  /** @type {SchemaUtilErrorObject[]} */
  errors: SchemaUtilErrorObject[];
  /** @type {Schema} */
  schema: Schema;
  /** @type {string} */
  headerName: string;
  /** @type {string} */
  baseDataPath: string;
  /** @type {PostFormatter | null} */
  postFormatter: PostFormatter | null;
  /**
   * @param {string} path path
   * @returns {Schema} schema
   */
  getSchemaPart(path: string): Schema;
  /**
   * @param {Schema} schema schema
   * @param {boolean} logic logic
   * @param {object[]} prevSchemas prev schemas
   * @returns {string} formatted schema
   */
  formatSchema(schema: Schema, logic?: boolean, prevSchemas?: object[]): string;
  /**
   * @param {Schema=} schemaPart schema part
   * @param {(boolean | string[])=} additionalPath additional path
   * @param {boolean=} needDot true when need dot
   * @param {boolean=} logic logic
   * @returns {string} schema part text
   */
  getSchemaPartText(
    schemaPart?: Schema | undefined,
    additionalPath?: (boolean | string[]) | undefined,
    needDot?: boolean | undefined,
    logic?: boolean | undefined,
  ): string;
  /**
   * @param {Schema=} schemaPart schema part
   * @returns {string} schema part description
   */
  getSchemaPartDescription(schemaPart?: Schema | undefined): string;
  /**
   * @param {SchemaUtilErrorObject} error error object
   * @returns {string} formatted error object
   */
  formatValidationError(error: SchemaUtilErrorObject): string;
  /**
   * @param {SchemaUtilErrorObject[]} errors errors
   * @returns {string} formatted errors
   */
  formatValidationErrors(errors: SchemaUtilErrorObject[]): string;
}
