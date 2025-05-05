import vine from '@vinejs/vine'

export const elementValidator = vine.compile(
  vine.object({
    planId: vine.number().positive(),
    type: vine.string().trim().minLength(1).maxLength(50),
    positionX: vine.number(),
    positionY: vine.number(),
    width: vine.number().positive(),
    height: vine.number().positive(),
    objectiveValue: vine.number(),
  })
)

export const elementPositionValidator = vine.compile(
  vine.object({
    positionX: vine.number(),
    positionY: vine.number(),
  })
)
