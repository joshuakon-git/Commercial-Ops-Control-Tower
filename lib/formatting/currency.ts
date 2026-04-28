const compactCurrencyUnits = [
  { threshold: 1_000_000_000, suffix: "b" },
  { threshold: 1_000_000, suffix: "m" },
  { threshold: 1_000, suffix: "k" },
];

export function formatCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const unit = compactCurrencyUnits.find((item) => absoluteValue >= item.threshold);

  if (!unit) {
    return `${sign}£${formatCurrencyNumber(absoluteValue)}`;
  }

  return `${sign}£${formatCurrencyNumber(absoluteValue / unit.threshold)}${unit.suffix}`;
}

function formatCurrencyNumber(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

const currencyAmountInTextPattern = /(?<![\w])[$£]?(-?\d{1,3}(?:,\d{3})+|-?\d+)\.\d{2}\b/g;

export function formatCurrencyAmountsInText(text: string) {
  return text.replace(currencyAmountInTextPattern, (match, value, offset, source) => {
    if (source[offset + match.length] === "%") {
      return match;
    }

    const numericValue = Number(value.replace(/,/g, ""));

    return Number.isFinite(numericValue) ? formatCurrency(numericValue) : match;
  });
}
