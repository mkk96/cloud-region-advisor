/**
 * Cloud catalogue. To add a cloud, create js/clouds/<id>.js exporting
 * `defineCloud({...})` and list it here; order = order of the header switch.
 */

import gcp from "./gcp.js";
import aws from "./aws.js";
import azure from "./azure.js";

export const CLOUD_LIST = [gcp, aws, azure];
export const CLOUDS = Object.fromEntries(CLOUD_LIST.map((c) => [c.id, c]));
export const DEFAULT_CLOUD = CLOUD_LIST[0].id;
