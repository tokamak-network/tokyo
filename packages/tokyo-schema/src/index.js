import schema from "./lib/schema";
import { testValue } from "./lib/utils";

export default schema;

export function validate(data) {
  const { error, value } = schema.validate(data);
  if (error) throw error;

  const testError = testValue(value);
  if (testError) throw testError;

  return value;
}
