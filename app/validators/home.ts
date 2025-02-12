import vine from '@vinejs/vine'

export const onboardingValidator = vine.compile(
  vine.object({
    nbChickens: vine.number().max(50).min(1),
  })
)
