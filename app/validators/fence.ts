import vine from '@vinejs/vine'

export const fenceValidator = vine.compile(
  vine.object({
    planId: vine.number().positive(),
    startX: vine.number(),
    startY: vine.number(),
    endX: vine.number(),
    endY: vine.number(),
  })
)

export const fenceUpdateValidator = vine.compile(
  vine.object({
    vertexStartId: vine.number().positive(),
    vertexEndId: vine.number().positive(),
  })
)

export const fenceLinkValidator = vine.compile(
  vine.object({
    oldVertex: vine.number().positive(),
    newVertex: vine.number().positive(),
  })
)
