function rateAt(amounts, marketplaceCount) {
  return amounts ? amounts[Math.min(marketplaceCount, amounts.length) - 1] : 1
}

// A rate is { give, receive }: `give` of the given resource buy `receive` of the other. The data
// lists, by Marketplaces owned, the side of a rate that isn't one; its last entry holds for any
// more Marketplaces than it lists.
export function tradeRate(marketplace, marketplaceCount, given, received) {
  const givenKind = marketplace?.kinds?.[given]
  const receivedKind = marketplace?.kinds?.[received]
  const rates = marketplace?.rates?.[`${givenKind}-${receivedKind}`]
  if (given === received || !rates || marketplaceCount < 1) {
    return null
  }
  return {
    give: rateAt(rates.give, marketplaceCount),
    receive: rateAt(rates.receive, marketplaceCount)
  }
}

export function mostLots(rate, amountHeld) {
  return rate ? Math.floor(Math.max(0, amountHeld) / rate.give) : 0
}

export function tradeOf(rate, lots) {
  return { given: rate.give * lots, received: rate.receive * lots }
}
