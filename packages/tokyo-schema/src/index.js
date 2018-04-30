import schema from "./lib/schema";
import { testValue } from "./lib/utils";

export default function validate(data) {
  const result = schema.validate(data);

  if (result.error) {
    return result;
  }

  const testError = testValue(result.value);

  if (testError) {
    result.error = testError;
  }

  return result;
}
