import vine from '@vinejs/vine'

export const planNameValidator = vine.compile(
  vine.object({
    newName: vine.string().trim().maxLength(50).minLength(1).alphaNumeric(),
  })
)
