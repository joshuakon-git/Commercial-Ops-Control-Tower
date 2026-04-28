import assert from "node:assert/strict";
import { test } from "node:test";

import { formatCurrencyAmountsInText } from "./currency.ts";

test("formats two-decimal currency-like amounts in generated risk text", () => {
  assert.equal(
    formatCurrencyAmountsInText("Projected revenue of 29504.00 is 57.9% below the target of 70000.00."),
    "Projected revenue of £29.5k is 57.9% below the target of £70k.",
  );
});

test("leaves percentages and dates unchanged when formatting generated text", () => {
  assert.equal(
    formatCurrencyAmountsInText("Gross margin fell from 43.00% to 37.00% by 2026-04-27."),
    "Gross margin fell from 43.00% to 37.00% by 2026-04-27.",
  );
});
