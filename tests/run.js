/** Test entry: registers every test file, then runs and reports. */

import "./recommend.test.js";
import "./analytics.test.js";
import { report } from "./runner.js";

report();
