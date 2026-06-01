import { describe, expect, it } from "vitest";

import { adaptApiContracts, materializeApiArtifacts } from "../../../src/adapters/api-contract.adapter.js";

describe("api-contract.adapter", () => {
  it("adapts custom apis[] contract list", () => {
    const adapted = adaptApiContracts(
      {
        apis: [
          {
            apiId: "auth.send_otp",
            method: "POST",
            path: "/auth/send-otp"
          },
          {
            apiId: "auth.verify_otp",
            method: "POST",
            path: "/auth/verify-otp",
            dependsOn: [
              {
                from: "auth.send_otp",
                to: "auth.verify_otp",
                via: "request_id"
              }
            ]
          },
          {
            apiId: "ccbp.bill_fetch",
            method: "POST",
            path: "/bbps/v1/ccbp/bill-fetch"
          }
        ]
      },
      "bbps/ccbp"
    );

    expect(adapted.kind).toBe("prebuilt");
    if (adapted.kind === "prebuilt") {
      const artifacts = materializeApiArtifacts(adapted, "bbps/ccbp");
      expect(artifacts.apiContracts.apis).toHaveLength(3);
      expect(artifacts.dependencyGraph.edges.length).toBeGreaterThanOrEqual(1);
    }
  });
});
