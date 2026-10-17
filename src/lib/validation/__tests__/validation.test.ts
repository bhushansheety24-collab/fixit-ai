import { describe, it, expect } from "vitest";
import {
  createAnalysisSchema,
  createProfessionalSchema,
  updateRepairRequestSchema,
  createReviewSchema,
  createRepairRequestSchema,
  sendMessageSchema,
  comparisonInputSchema,
  itemCategorySchema,
  ITEM_CATEGORIES,
} from "@/lib/validation/schemas";

describe("createAnalysisSchema", () => {
  const valid = {
    itemName: "Kettle that stopped heating",
    category: "Home Appliances" as const,
    problemDescription: "It boils occasionally then stops. Bought 2 years ago.",
    condition: "used",
  };

  it("accepts a valid analysis", () => {
    expect(createAnalysisSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional images, price and age", () => {
    const parsed = createAnalysisSchema.safeParse({
      ...valid,
      imageUrls: ["https://example.com/photo.jpg"],
      purchasePrice: "1999",
      itemAge: "24",
      brand: "Tesora",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.purchasePrice).toBe(1999);
      expect(parsed.data.itemAge).toBe(24);
      expect(parsed.data.imageUrls).toHaveLength(1);
    }
  });

  it("rejects an unknown category", () => {
    const parsed = createAnalysisSchema.safeParse({ ...valid, category: "Spaceships" });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty names and short descriptions", () => {
    expect(createAnalysisSchema.safeParse({ ...valid, itemName: "" }).success).toBe(false);
    expect(
      createAnalysisSchema.safeParse({ ...valid, problemDescription: "broken" }).success,
    ).toBe(false);
    expect(
      createAnalysisSchema.safeParse({ ...valid, problemDescription: "" }).success,
    ).toBe(false);
  });

  it("rejects absurdly long input", () => {
    expect(
      createAnalysisSchema.safeParse({ ...valid, problemDescription: "x".repeat(4001) }).success,
    ).toBe(false);
  });

  it("rejects too many images and negative prices", () => {
    expect(
      createAnalysisSchema.safeParse({
        ...valid,
        imageUrls: Array.from({ length: 7 }, (_, i) => `https://e.com/${i}.jpg`),
      }).success,
    ).toBe(false);

    expect(
      createAnalysisSchema.safeParse({ ...valid, purchasePrice: -50 }).success,
    ).toBe(false);
  });
});

describe("nullable form fields (regression)", () => {
  // Browser forms send `null` (not `undefined`) for empty optional inputs.
  // `.optional()` alone allows undefined only, so these must accept null.
  const analysisWithNulls = {
    itemName: "E2E Kettle",
    category: "Home Appliances" as const,
    problemDescription: "Stops heating after a few seconds.",
    brand: null,
    model: null,
    purchasePrice: null,
    itemAge: null,
    condition: null,
    symptoms: null,
    warrantyInfo: null,
    imageUrls: [],
  };

  it("accepts null optional fields from the analyze form", () => {
    const parsed = createAnalysisSchema.safeParse(anonymousFormPayload());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.purchasePrice).toBeNull();
      expect(parsed.data.itemAge).toBeNull();
    }
  });

  it("normalises empty strings to null", () => {
    const parsed = createAnalysisSchema.safeParse({
      ...anonymousFormPayload(),
      purchasePrice: "",
      itemAge: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.purchasePrice).toBeNull();
      expect(parsed.data.itemAge).toBeNull();
    }
  });

  it("still rejects negative and out-of-range values", () => {
    expect(
      createAnalysisSchema.safeParse({ ...anonymousFormPayload(), purchasePrice: -1 }).success,
    ).toBe(false);
    expect(
      createAnalysisSchema.safeParse({ ...anonymousFormPayload(), itemAge: 5000 }).success,
    ).toBe(false);
  });

  it("accepts a null starting price for professionals", () => {
    const parsed = createProfessionalSchema.safeParse({
      name: "Demo Repairs",
      description: "We repair kettles and mixers.",
      specializations: ["Home Appliances"],
      startingPrice: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.startingPrice).toBeNull();
  });

  it("accepts a null quoted price on repair requests", () => {
    expect(updateRepairRequestSchema.safeParse({ quotedPrice: null }).success).toBe(true);
    expect(updateRepairRequestSchema.safeParse({ quotedPrice: "450" }).success).toBe(true);
  });

  function anonymousFormPayload() {
    return { ...createAnalysisSchemaInput };
  }
});

const createAnalysisSchemaInput = {
  itemName: "E2E Kettle",
  category: "Home Appliances" as const,
  brand: null,
  model: null,
  purchasePrice: null,
  itemAge: null,
  condition: null,
  problemDescription: "Stops heating after a few seconds.",
  symptoms: null,
  warrantyInfo: null,
  imageUrls: [],
};

describe("item categories", () => {
  it("exposes the same list the decision engine has thresholds for", () => {
    for (const category of ITEM_CATEGORIES) {
      expect(itemCategorySchema.safeParse(category).success).toBe(true);
    }
    expect(ITEM_CATEGORIES).toContain("Electronics");
    expect(ITEM_CATEGORIES).toContain("Other");
  });
});

describe("createReviewSchema", () => {
  it("accepts ratings 1..5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(createReviewSchema.safeParse({ rating }).success).toBe(true);
    }
  });

  it("rejects out-of-range ratings", () => {
    expect(createReviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 4.5 }).success).toBe(false);
  });
});

describe("createRepairRequestSchema", () => {
  it("requires an analysis, a professional and a description", () => {
    expect(
      createRepairRequestSchema.safeParse({
        analysisId: "a1",
        professionalId: "p1",
        description: "Please fix the kettle",
      }).success,
    ).toBe(true);

    expect(
      createRepairRequestSchema.safeParse({ analysisId: "a1", description: "hi" }).success,
    ).toBe(false);
  });
});

describe("sendMessageSchema", () => {
  it("rejects empty and whitespace-only messages", () => {
    expect(sendMessageSchema.safeParse({ content: "" }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("caps message length", () => {
    expect(sendMessageSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ content: "x".repeat(2000) }).success).toBe(true);
  });
});

describe("comparisonInputSchema", () => {
  it("accepts repair vs replacement costs", () => {
    const parsed = comparisonInputSchema.safeParse({
      repairCost: 500,
      replacementCost: 1200,
      category: "Electronics",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects negative costs", () => {
    expect(
      comparisonInputSchema.safeParse({ repairCost: -1, replacementCost: 100 }).success,
    ).toBe(false);
  });
});
