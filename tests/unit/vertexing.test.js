import { describe, test, expect } from "vitest";
import { applyVertexDistance, convertSpectacleRxToContactLens, DEFAULT_VERTEX_DISTANCE_M } from "../../server/catalog.js";

describe("applyVertexDistance", () => {
  test("defaults to the standard 12mm vertex distance", () => {
    // Arrange
    const spherePower = -10;

    // Act
    const corrected = applyVertexDistance(spherePower);

    // Assert
    expect(corrected).toBeCloseTo(spherePower / (1 - DEFAULT_VERTEX_DISTANCE_M * spherePower), 6);
  });

  test("a minus power moves closer to plano (less minus) when corrected for vertex distance", () => {
    // Arrange & Act
    const corrected = applyVertexDistance(-10, 0.012);

    // Assert
    expect(corrected).toBeGreaterThan(-10);
    expect(corrected).toBeCloseTo(-8.9286, 3);
  });

  test("a plus power moves further from plano (more plus) when corrected for vertex distance", () => {
    // Arrange & Act
    const corrected = applyVertexDistance(10, 0.012);

    // Assert
    expect(corrected).toBeGreaterThan(10);
  });

  test("accepts a caller-specified vertex distance instead of the default", () => {
    // Arrange & Act
    const corrected = applyVertexDistance(-10, 0.0135);

    // Assert
    expect(corrected).toBeCloseTo(-10 / (1 - 0.0135 * -10), 6);
  });

  test("rejects a non-finite power", () => {
    expect(() => applyVertexDistance(NaN)).toThrow("Power must be a finite number.");
  });

  test("rejects a non-positive vertex distance", () => {
    expect(() => applyVertexDistance(-5, 0)).toThrow("Vertex distance must be a positive number of meters.");
  });

  test("rejects a power so high it is undefined at the given vertex distance", () => {
    // 1 / 0.012 = 83.33D is exactly where the correction formula divides by zero.
    expect(() => applyVertexDistance(1 / 0.012, 0.012)).toThrow("too high to vertex-correct");
  });
});

describe("convertSpectacleRxToContactLens", () => {
  test("corrects a sphere-only spectacle Rx and rounds to the nearest 0.25D", () => {
    // Arrange
    const spherePower = -10;

    // Act
    const result = convertSpectacleRxToContactLens(spherePower);

    // Assert: raw value is -8.9286, nearest quarter-diopter is -9.00
    expect(result).toEqual({ sphere: -9, cyl: 0 });
  });

  test("defaults cylinder to 0 when omitted, leaving sphere-only behavior", () => {
    // Arrange & Act
    const withoutCyl = convertSpectacleRxToContactLens(-6);
    const withZeroCyl = convertSpectacleRxToContactLens(-6, 0);

    // Assert
    expect(withoutCyl).toEqual(withZeroCyl);
  });

  test("corrects a toric spectacle Rx via the meridian method", () => {
    // Arrange: -6.00 -2.00 x180 at the standard 12mm vertex distance.
    // Meridian powers: -6.00 and -8.00, vertex-corrected to -5.5970 and
    // -7.2993 respectively - sphere is the first, cyl is their difference.
    const spherePower = -6;
    const cylPower = -2;

    // Act
    const result = convertSpectacleRxToContactLens(spherePower, cylPower);

    // Assert
    expect(result).toEqual({ sphere: -5.5, cyl: -1.75 });
  });

  test("identifies the same pair of corrected meridian powers regardless of which meridian is called sphere", () => {
    // Arrange: -6.00 -2.00 describes meridian powers -6.00 and -8.00.
    // Relabeling the same two meridians the other way around is -8.00 +2.00
    // (this is exactly the minus-cyl <-> plus-cyl notation conversion).
    const asFirst = convertSpectacleRxToContactLens(-6, -2);
    const asSecond = convertSpectacleRxToContactLens(-8, 2);

    // Assert: each form's "sphere" meridian, once corrected, must equal the
    // other form's "sphere + cyl" meridian - they're the same physical meridian.
    expect(asFirst.sphere).toBeCloseTo(asSecond.sphere + asSecond.cyl, 2);
    expect(asSecond.sphere).toBeCloseTo(asFirst.sphere + asFirst.cyl, 2);
  });

  test("honors a caller-specified vertex distance for toric correction", () => {
    // Arrange & Act: a strong enough Rx that 12mm vs 13.5mm still differs
    // after rounding to the nearest 0.25D (weaker Rxs can round to the same value).
    const at12mm = convertSpectacleRxToContactLens(-14, -4, 0.012);
    const at13_5mm = convertSpectacleRxToContactLens(-14, -4, 0.0135);

    // Assert
    expect(at13_5mm).not.toEqual(at12mm);
  });

  test("rejects a non-finite sphere power", () => {
    expect(() => convertSpectacleRxToContactLens("not-a-number")).toThrow("Sphere power must be a finite number.");
  });

  test("rejects a non-finite cylinder power", () => {
    expect(() => convertSpectacleRxToContactLens(-6, "not-a-number")).toThrow("Cylinder power must be a finite number.");
  });
});
