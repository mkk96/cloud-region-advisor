/** Marks steps 1–3 as done (✓) as the user completes them. */

import { $ } from "./dom.js";
import { state, cloudState } from "../state/store.js";

export function renderSteps() {
  const cs = cloudState();
  const measured = Object.values(cs.measured).some((r) => r.ok) && !cs.measuredShared;
  $("#step1").classList.toggle("done", state.locations.length > 0);
  $("#step2").classList.toggle("done", measured && !state.testing);
  $("#step3").classList.toggle("done", state.residency !== "none" || cs.services.length > 0);
}
