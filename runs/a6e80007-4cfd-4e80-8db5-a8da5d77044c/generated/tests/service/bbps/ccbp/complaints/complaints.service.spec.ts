import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpComplaintsService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpComplaintsService";
import type { CcbpComplaintsRequest } from "../../../../../src/models/eqx/bbps/ccbp/complaints.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.complaints. Extend with negative cases as needed. */
test("@smoke Verify ccbp.complaints service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpComplaintsService(apiClient);
  const body = svc.complaints({} as CcbpComplaintsRequest, headers);;
  expect(body).toBeTruthy();
});
