import vine from '@vinejs/vine'

export const vertexValidator = vine.compile(
  vine.object({
    planId: vine.number().positive(),
    positionX: vine.number(),
    positionY: vine.number(),
  })
)
export const vertexUpdateValidator = vine.compile(
  vine.object({
    positionX: vine.number(),
    positionY: vine.number(),
  })
)
