import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Vertex from '#models/vertex'

@inject()
export default class VerticesController {
  //
  //
  async updatePosition({ params, response, request }: HttpContext) {
    const { positionX, positionY } = request.body()

    try {
      // Find vertex
      const vertex = await Vertex.findOrFail(params.id)

      // Update it
      vertex.positionX = positionX
      vertex.positionY = positionY

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
