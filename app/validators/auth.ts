import vine from '@vinejs/vine'
// VineJS library comes pre-configured  with AdonisJS web starter kit
// validation library

// VALIDATORS

// methods
// .string() ensure input is a string
// .trim() remove start and end spaces
// .minlength(x) minimum length of x
// .maxlength(y) maximum length of y
// alphanumeric() ensure alphanumeric characters
// unique() ensure uniqueness in DB
// confirmed() ensure input from this field and the confirmation field are equals

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
//
export const loginUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
  })
)
//
//
export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
  })
)
//
//
export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string(),
    email: vine.string().email(),
    password: vine.string().minLength(8).confirmed(),
  })
)
