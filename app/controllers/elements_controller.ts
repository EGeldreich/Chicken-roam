import Element from '#models/element'
import Vertex from '#models/vertex'
import type { HttpContext } from '@adonisjs/core/http'

export default class ElementsController {
  async create({ request, response }: HttpContext) {
    const { type, planId, position } = request.body()

    // Create vertices for the element
    const vertex = await Vertex.create({
      positionX: position.x,
      positionY: position.y,
      planId,
    })

    // Create the element
    const element = await Element.create({
      type,
      planId,
      objectiveValue: 1, // This would vary based on element type
    })

    // Link element to vertex
    await element.related('vertices').attach({
      [vertex.id]: {
        vertexOrder: 0,
      },
    })

    return response.created(element)
  }
}
