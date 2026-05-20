import { describe, expect, it } from "vitest";
import { firebaseUidFromEmail } from "../../backend/src/lib/ids/firebaseUid";

describe("firebaseUidFromEmail", () => {
  it("returns stable uid for same email", () => {
    const a = firebaseUidFromEmail("Farmer@Example.com");
    const b = firebaseUidFromEmail("farmer@example.com");
    expect(a).toBe(b);
    expect(a).toHaveLength(28);
  });
});
