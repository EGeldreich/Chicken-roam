import vine, { SimpleMessagesProvider } from '@vinejs/vine'
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

// Personalized error messages
const messages = {
  regex:
    'The {{ field }} must contain at least 12 characters, including at least one uppercase letter, one lowercase letter, one number, and one special character.',
  accepted: 'You must accept the Terms and Privacy Policy to continue',
}
vine.messagesProvider = new SimpleMessagesProvider(messages)

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
    password: vine
      .string()
      .regex(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,}$/))
      .confirmed(),
    gdpr: vine.accepted(),
  })
)
//
//
export const loginUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
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
    password: vine
      .string()
      .regex(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{12,}$/))
      .confirmed(),
  })
)
