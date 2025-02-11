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

export const editEmailValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .trim()
      .maxLength(254)
      .unique(async (db, value) => {
        const users = await db.from('users').where('email', value).first()
        return !users
      }),
  })
)
