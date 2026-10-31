/** Test entry: registers every test file, then runs and reports. */

import "./recommend.test.js";
import "./analytics.test.js";
import "./pagination.test.js";
import "./remote.test.js";
import { report } from "./runner.js";

report();
