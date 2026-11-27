export const PICTURES_PER_NOTICE = 8

// A message with more pictures than one window holds goes on in more windows, without its text.
export function noticesWithPictures(message, pictures) {
  const notices = []
  for (let start = 0; start < pictures.length; start += PICTURES_PER_NOTICE) {
    notices.push({
      title: null,
      message: start === 0 ? message : '',
      rewards: pictures.slice(start, start + PICTURES_PER_NOTICE)
    })
  }
  return notices
}
