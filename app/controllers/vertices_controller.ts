import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Vertex from '#models/vertex'
import { vertexValidator, vertexUpdateValidator } from '#validators/vertex'

@inject()
export default class VerticesController {
  //
  //
  async create({ request, response }: HttpContext) {
    const validatedData = await request.validateUsing(vertexValidator)

    const vertex = await Vertex.create({
      planId: validatedData.planId,
      positionX: validatedData.positionX,
      positionY: validatedData.positionY,
    })

    return response.created(vertex)
  }
  //
  //
  async updatePosition({ params, response, request }: HttpContext) {
    const validatedData = await request.validateUsing(vertexUpdateValidator)

    try {
      // Find vertex
      const vertex = await Vertex.findOrFail(params.id)

      // Update it
      vertex.positionX = validatedData.positionX
      vertex.positionY = validatedData.positionY

      // Save update
      await vertex.save()

      return response.ok({
        message: 'Vertex position updated successfully',
      })
    } catch (error) {
      console.error('Error updating vertex position:', error)
      return response.internalServerError({
        message: 'Failed to update vertex position',
        error: error.message,
      })
    }
  }
}
