import type { HttpContext } from '@adonisjs/core/http'
import Fence from '#models/fence'
import Vertex from '#models/vertex'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class FencesController {
  async create({ request, response }: HttpContext) {
    // We'll use a transaction to ensure both vertices and fence are created successfully
    const trx = await db.transaction()

    try {
      // Get the data from the request
      const { planId, startX, startY, endX, endY } = request.body()

      // Function to find or create vertex
      const getVertex = async (x: number, y: number) => {
        // Look for an existing vertex at these coordinates
        const existingVertex = await Vertex.query()
          .where('planId', planId)
          .where('positionX', x)
          .where('positionY', y)
          .first()

        if (existingVertex) {
          return existingVertex
        }

        // Create new vertex if none exists
        return await Vertex.create(
          {
            positionX: x,
            positionY: y,
            planId: planId,
          },
          { client: trx }
        )
      }
      // Get or create vertices
      const startVertex = await getVertex(startX, startY)
      const endVertex = await getVertex(endX, endY)

      // Create the fence connecting these vertices
      const fence = await Fence.create(
        {
          type: 'standard', // You might want to make this configurable later
          planId: planId,
          vertexStartId: startVertex.id,
          vertexEndId: endVertex.id,
        },
        { client: trx }
      )

      // If everything worked, commit the transaction
      await trx.commit()

      // Load the vertices for the response
      await fence.load('vertexStart')
      await fence.load('vertexEnd')

      // Return the created fence with its vertices
      return response.created(fence)
    } catch (error) {
      // If anything goes wrong, rollback the transaction
      await trx.rollback()

      console.error('Error creating fence:', error)
      return response.internalServerError({
        message: 'Failed to create fence',
        error: error.message,
      })
    }
  }

  async getByPlan({ params, response }: HttpContext) {
    try {
      // Find all fences for the given plan, including their vertices
      const fences = await Fence.query()
        .where('planId', params.planId)
        .preload('vertexStart')
        .preload('vertexEnd')

      return response.ok(fences)
    } catch (error) {
      console.error('Error fetching fences:', error)
      return response.internalServerError({
        message: 'Failed to fetch fences',
        error: error.message,
      })
    }
  }

  async delete({ params, response }: HttpContext) {
    try {
      // Find fence
      const fence = await Fence.findOrFail(params.id)
      // Load plan
      await fence.load('plan')
      // Find related Plan
      const plan = fence.plan

      // Get vertex IDs before deleting the fence
      const startVertexId = fence.vertexStartId
      const endVertexId = fence.vertexEndId

      // Delete the fence
      await fence.delete()

      plan.isEnclosed = false

      await plan.save()

      // Delete the vertices if they're not used by other fences
      await Vertex.query()
        .whereIn('id', [startVertexId, endVertexId]) // WHERE id IN (startVertexId, endVertexId)
        .whereDoesntHave('startFences', (query) => {
          query.where('vertex_start_id', endVertexId)
        })
        .whereDoesntHave('endFences', (query) => {
          query.where('vertex_end_id', startVertexId)
        })
        .delete()

      return response.status(200).json({ message: 'Fence deleted successfully' })
    } catch (error) {
      console.error('Error deleting fence:', error)
      return response.status(500).json({
        message: 'Failed to delete fence',
        error: error.message,
      })
    }
  }
}
