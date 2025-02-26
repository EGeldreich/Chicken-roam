import type { HttpContext } from '@adonisjs/core/http'
import Fence from '#models/fence'
import Vertex from '#models/vertex'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { PlanState } from '#models/plan'

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
      // Load plan with objectives
      await fence.load('plan')
      const plan = fence.plan
      await plan.load('objectives')

      // Get area objective
      const areaObjective = plan.objectives.find((obj) => obj.name === 'area')

      // Get vertex IDs before deleting the fence
      const startVertexId = fence.vertexStartId
      const endVertexId = fence.vertexEndId
      // Delete the fence
      await fence.delete()

      // Update plan state based on enclosure status
      if (plan.isEnclosed) {
        // Transition from enclosed to broken
        plan.isEnclosed = false
        plan.state = PlanState.BROKEN

        // Reset area objective to 0
        if (areaObjective) {
          await plan
            .related('objectives')
            .pivotQuery()
            .where('plan_id', plan.id)
            .where('objective_id', areaObjective.id)
            .update({ completion_percentage: 0 })
        }
      }

      // Save changes
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

      return response.status(200).json({
        message: 'Fence deleted successfully',
        objectives: areaObjective
          ? [
              {
                id: areaObjective.id,
                name: areaObjective.name,
                description: areaObjective.description,
                target_value: areaObjective.$extras.pivot_target_value,
                completion_percentage: 0,
                unit: areaObjective.unit,
              },
            ]
          : [],
        planState: plan.state,
      })
    } catch (error) {
      console.error('Error deleting fence:', error)
      return response.status(500).json({
        message: 'Failed to delete fence',
        error: error.message,
      })
    }
  }
}
