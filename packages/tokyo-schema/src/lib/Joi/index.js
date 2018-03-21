import BaseJoi from "joi";

import BigNumberExtend from "./extenders/BigNumber";
import AccountExtend from "./extenders/Account";
import TimeExtend from "./extenders/Time";

export default BaseJoi
  .extend(BigNumberExtend)
  .extend(AccountExtend)
  .extend(TimeExtend);
