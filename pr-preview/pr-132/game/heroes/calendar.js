const DAYS_PER_WEEK = 7
const WEEKS_PER_MONTH = 4

export function calendarDateOfTurn(turnNumber) {
  const dayIndex = Math.max(0, Math.floor(Number(turnNumber) || 1) - 1)
  const weekIndex = Math.floor(dayIndex / DAYS_PER_WEEK)

  return {
    month: Math.floor(weekIndex / WEEKS_PER_MONTH) + 1,
    week: (weekIndex % WEEKS_PER_MONTH) + 1,
    day: (dayIndex % DAYS_PER_WEEK) + 1
  }
}

export function formatCalendarDate({ month, week, day }) {
  return `Month: ${month}, Week: ${week}, Day: ${day}`
}
