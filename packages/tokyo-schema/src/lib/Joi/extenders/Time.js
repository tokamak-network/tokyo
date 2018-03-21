import moment from "moment";
import { DATE_FORMAT } from "../../../constants";

export default joi => ({
  base: joi.string(),
  name: "Time",
  language: {
    utc: "{{q}} needs to valid moment time in UTC",
  },
  rules: [
    {
      name: "utc",
      validate(params, value, state, options) {
        const momentValue = moment.utc(value, DATE_FORMAT);

        // check valid moment value & valid date format
        if (!momentValue.isValid() || moment(value, DATE_FORMAT).format(DATE_FORMAT) !== value) {
          return this.createError("Time.utc", { v: value }, state, options);
        }

        return momentValue.unix();
      },
    },
  ],
});
