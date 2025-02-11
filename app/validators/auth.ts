import vine from '@vinejs/vine'

export const registerUserValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(2).maxLength(50).alphaNumeric(),
    email: vine
      .string()
      .trim()
      .maxLength(254)
      .unique(async (db, value) => {
        const users = await db.from('users').where('email', value).first()
        return !users
      }),
    password: vine.string().minLength(8).confirmed(),
  })
)
//
export const loginUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
  })
)
//
export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
  })
)
//
export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string(),
    email: vine.string().email(),
    password: vine.string().minLength(8).confirmed(),
  })
)
