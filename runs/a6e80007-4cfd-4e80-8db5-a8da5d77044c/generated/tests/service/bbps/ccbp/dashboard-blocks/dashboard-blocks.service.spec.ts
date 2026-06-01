import { expect } from "@playwright/test";
import { test } from "../../../../../src/fixtures/infrastructure.fixture";
import { CcbpDashboardBlocksService } from "../../../../../src/services/eqx/bbps/ccbp/CcbpDashboardBlocksService";
import type { DashboardBlocksRequest } from "../../../../../src/models/eqx/bbps/ccbp/dashboard-blocks.models";
import { buildBBPSHeadersRaw } from "../../../../../tests/integration/bbps/ccbp/shared/headers";


/** Generated smoke spec for ccbp.dashboard_blocks. Extend with negative cases as needed. */
test("@smoke Verify ccbp.dashboard_blocks service method succeeds with auth headers", async ({ apiClient }) => {
  const headers = buildBBPSHeadersRaw(process.env.TEST_AUTH_TOKEN ?? "");
  const svc = new CcbpDashboardBlocksService(apiClient);
  const body = svc.dashboardBlocks({} as DashboardBlocksRequest, headers);;
  expect(body).toBeTruthy();
});
