import { test } from "../../../../src/fixtures/infrastructure.fixture";
import { assertBbpsCcbpNewUserSmokeGeneratedContracts } from "./new-user/assertions.generated";
import { runBbpsCcbpNewUserSmokeGenerated } from "./new-user/journey.generated";

/** Generated integration spec for UNIT-SMOKE-001 */
test("@smoke UNIT-SMOKE-001 generated journey checkpoint", async ({ apiClient }) => {
  const ctx = await runBbpsCcbpNewUserSmokeGenerated(apiClient);
  assertBbpsCcbpNewUserSmokeGeneratedContracts(ctx);
});
