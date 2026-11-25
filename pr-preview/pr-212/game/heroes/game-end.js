export const GAME_END_MESSAGES = Object.freeze({
  victory: 'Congratulations! All your enemies have been defeated! Victory is yours!',
  defeat: 'All your forces have been defeated, and you are banished from this land!'
})

export const vanquishedMessage = (player) => `${playerName(player)} has been vanquished!`

export const DAYS_TO_CAPTURE_A_TOWN = 7

export function daysLeftMessage(player, daysWithoutTown) {
  const daysLeft = DAYS_TO_CAPTURE_A_TOWN - daysWithoutTown
  return daysLeft > 1
    ? `${playerName(player)}, you only have ${daysLeft} days left to capture a town or you will be banished from this land.`
    : `${playerName(player)}, this is your last day to capture a town or you will be banished from this land.`
}

export const isBanished = (daysWithoutTown) => daysWithoutTown >= DAYS_TO_CAPTURE_A_TOWN

export const playerBanishedMessage = (player) =>
  `${playerName(player)}, your heroes abandon you, and you are banished from this land.`

export const banishedMessage = (player) =>
  `${playerName(player)}'s heroes have abandoned him, and he is banished from this land.`

// The colour a player is named by in messages, "Blue".
export function playerName(player) {
  return `${player.charAt(0).toUpperCase()}${player.slice(1)}`
}
