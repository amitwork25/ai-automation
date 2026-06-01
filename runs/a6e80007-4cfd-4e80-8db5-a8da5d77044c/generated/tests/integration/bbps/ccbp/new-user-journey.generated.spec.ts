import { test } from "../../../../src/fixtures/infrastructure.fixture";
import { assertBbpsCcbpNewUserCcbpNewUserJourneyGeneratedContracts } from "./new-user/assertions.generated";
import { runBbpsCcbpNewUserCcbpNewUserJourneyGenerated } from "./new-user/journey.generated";

/** Generated integration spec for TC-39 */
test("@smoke TC-39 generated journey checkpoint", async ({ apiClient }) => {
  const ctx = await runBbpsCcbpNewUserCcbpNewUserJourneyGenerated(apiClient);
  assertBbpsCcbpNewUserCcbpNewUserJourneyGeneratedContracts(ctx);
});
