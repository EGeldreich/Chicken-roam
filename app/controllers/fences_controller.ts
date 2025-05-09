import type { HttpContext } from '@adonisjs/core/http'
import Fence from '#models/fence'
import Vertex from '#models/vertex'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { PlanState } from '#models/plan'
import { fenceValidator, fenceLinkValidator, fenceUpdateValidator } from '#validators/fence'

@inject()
export default class FencesController {
  async create({ request, response }: HttpContext) {
    // Validate data from the request
    const validatedData = await request.validateUsing(fenceValidator)
    // Transaction to ensure both vertices and fence are created successfully
    const trx = await db.transaction()

    try {
      // Function to find or create vertex
      const getVertex = async (x: number, y: number) => {
        // Look for an existing vertex at these coordinates
        const existingVertex = await Vertex.query()
          .where('planId', validatedData.planId)
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
            planId: validatedData.planId,
          },
          { client: trx }
        )
      }
      // Get or create vertices
      const startVertex = await getVertex(validatedData.startX, validatedData.startY)
      const endVertex = await getVertex(validatedData.endX, validatedData.endY)

      // Create the fence connecting these vertices
      const fence = await Fence.create(
        {
          type: 'standard', // You might want to make this configurable later
          planId: validatedData.planId,
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
            .update({
              completion_percentage: 0,
              current_value: 0,
            })
        }
      }

      // Save changes
      await plan.save()

      // Delete the vertices if they're not used by other fences
      await Vertex.query()
        .whereIn('id', [startVertexId, endVertexId])
        .whereDoesntHave('startFences', (query) => {
          query.where('vertex_start_id', endVertexId)
          query.orWhere('vertex_start_id', startVertexId)
        })
        .whereDoesntHave('endFences', (query) => {
          query.where('vertex_end_id', startVertexId)
          query.orWhere('vertex_end_id', endVertexId)
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
                current_value: 0,
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
  //
  //
  async link({ params, request, response }: HttpContext) {
    // Validate data from the request
    const validatedData = await request.validateUsing(fenceLinkValidator)

    try {
      // Find the fence to update
      const fence = await Fence.findOrFail(params.id)

      // Load vertices
      await fence.load('vertexStart')
      await fence.load('vertexEnd')

      // Find the oldVertex in relation to the fence
      let isStartVertex = false
      if (fence.vertexStartId === validatedData.oldVertex) {
        isStartVertex = true
      } else if (fence.vertexEndId === validatedData.oldVertex) {
        isStartVertex = false
      } else {
        return response.badRequest({
          error: 'Cannot find specified oldVertex',
        })
      }

      // Replace the old vertex by the new one
      if (isStartVertex) {
        fence.vertexStartId = validatedData.newVertex
      } else {
        fence.vertexEndId = validatedData.newVertex
      }

      // Save Fence change
      await fence.save()

      // Find old vertex in DB
      const vertexToDelete = await Vertex.find(validatedData.oldVertex)

      if (vertexToDelete) {
        // Check if vertex is still in use
        await vertexToDelete.load('startFences')
        await vertexToDelete.load('endFences')
        await vertexToDelete.load('elements')

        // If not in use
        if (
          vertexToDelete.startFences.length === 0 &&
          vertexToDelete.endFences.length === 0 &&
          !vertexToDelete.elements
        ) {
          // Delete
          await vertexToDelete.delete()
        }
      }

      // Send response
      return response.ok({
        message: 'Clôture liée avec succès',
        fence: {
          id: fence.id,
          vertexStartId: fence.vertexStartId,
          vertexEndId: fence.vertexEndId,
        },
      })
    } catch (error) {
      console.error('Erreur lors de la liaison de clôture:', error)
      return response.internalServerError({
        error: 'Échec de la liaison de clôture',
        details: error.message,
      })
    }
  }
  //
  //
  async upgradeFence({ params, response }: HttpContext) {
    try {
      // Find fence to upgrade
      const fence = await Fence.findOrFail(params.id)

      // Change it's type
      fence.type = 'door'

      // Save
      await fence.save()

      return response.ok({
        message: 'fence upgraded successfully',
      })
    } catch (error) {
      console.error('Error upgrading fence element: ', error)
      return response.internalServerError({
        message: 'Failed to upgrade fence element',
        error: error.message,
      })
    }
  }
  //
  //
  async downgradeFence({ params, response }: HttpContext) {
    try {
      // Find fence to downgrade
      const fence = await Fence.findOrFail(params.id)

      // Change it's type
      fence.type = 'standard'

      // Save
      await fence.save()

      return response.ok({
        message: 'Door downgraded successfully',
      })
    } catch (error) {
      console.error('Error downgrading door element: ', error)
      return response.internalServerError({
        message: 'Failed to downgrade door element',
        error: error.message,
      })
    }
  }
  //
  //
  async update({ params, request, response }: HttpContext) {
    // Validate data from the request
    const validatedData = await request.validateUsing(fenceUpdateValidator)

    const fence = await Fence.findOrFail(params.id)

    await fence
      .merge({
        vertexStartId: validatedData.vertexStartId,
        vertexEndId: validatedData.vertexEndId,
      })
      .save()

    return response.ok(fence)
  }
  //
  //
  async createFromVertices({ request, response }: HttpContext) {
    const trx = await db.transaction()

    try {
      const { planId, type, vertexStartId, vertexEndId } = request.body()

      // Create new fence with vertices
      const fence = await Fence.create(
        {
          type: type || 'standard',
          planId,
          vertexStartId,
          vertexEndId,
        },
        { client: trx }
      )

      // validate ransaction
      await trx.commit()

      // load vertices
      await fence.load('vertexStart')
      await fence.load('vertexEnd')

      // Return created fence
      return response.created(fence)
    } catch (error) {
      await trx.rollback()

      console.error('Error creating fence from vertices:', error)
      return response.internalServerError({
        message: 'Failed to create fence from vertices',
        error: error.message,
      })
    }
  }
}
