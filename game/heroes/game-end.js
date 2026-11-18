export const GAME_END_MESSAGES = Object.freeze({
  victory: 'Congratulations! All your enemies have been defeated! Victory is yours!',
  defeat: 'All your forces have been defeated, and you are banished from this land!'
})

export const vanquishedMessage = (player) => `${playerName(player)} has been vanquished!`

// The colour a player is named by in messages, "Blue".
export function playerName(player) {
  return `${player.charAt(0).toUpperCase()}${player.slice(1)}`
}
