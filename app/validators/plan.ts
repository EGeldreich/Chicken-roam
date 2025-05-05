import vine from '@vinejs/vine'

export const planNameValidator = vine.compile(
  vine.object({
    newName: vine.string().trim().maxLength(50).minLength(1),
  })
)

export const enclosureCompletionValidator = vine.compile(
  vine.object({
    area: vine.number().positive(),
    elementsToUpdate: vine.array(vine.number()),
    elementsToRemove: vine.array(vine.number()),
  })
)
