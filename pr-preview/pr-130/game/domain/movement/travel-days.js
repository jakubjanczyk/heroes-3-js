// On which day the hero gets to the end of `path`: 1 when it gets there today with
// `remainingMovementPoints`, 2 when it needs tomorrow's `maxMovementPoints` too, and so on.
// Null when not even a full day's points take it a step further.
export function countTravelDays({
  map,
  path,
  chargeSteps,
  remainingMovementPoints,
  maxMovementPoints
}) {
  let day = 1
  let pathLeft = path
  let pointsLeft = remainingMovementPoints

  while (pathLeft.length > 1) {
    const stepsTaken = chargeSteps({
      map,
      path: pathLeft,
      remainingMovementPoints: pointsLeft
    }).length
    if (stepsTaken === pathLeft.length - 1) {
      return day
    }
    if (stepsTaken === 0 && pointsLeft >= maxMovementPoints) {
      return null
    }

    pathLeft = pathLeft.slice(stepsTaken)
    pointsLeft = maxMovementPoints
    day += 1
  }

  return day
}
