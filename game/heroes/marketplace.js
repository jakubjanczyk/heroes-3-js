// A rate is { give, receive }: `give` of the given resource buy `receive` of the other. The
// table's last rate holds for any more Marketplaces than it lists.
export function tradeRate(marketplace, marketplaceCount, given, received) {
  const givenKind = marketplace?.kinds?.[given]
  const receivedKind = marketplace?.kinds?.[received]
  if (given === received || !givenKind || !receivedKind || marketplaceCount < 1) {
    return null
  }
  const rates = marketplace.rates[`${givenKind}-${receivedKind}`]
  return rates[Math.min(marketplaceCount, rates.length) - 1]
}

export function mostLots(rate, amountHeld) {
  return rate ? Math.floor(Math.max(0, amountHeld) / rate.give) : 0
}

export function tradeOf(rate, lots) {
  return { given: rate.give * lots, received: rate.receive * lots }
}
