import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Fence from './fence.js'
import Objective from './objective.js'
import Vertex from './vertex.js'
import History from './history.js'
import Element from './element.js'

export default class Plan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare name: string

  @column()
  declare nbChickens: number

  @column()
  declare isTemporary: boolean

  @column()
  declare isCompleted: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Element)
  declare elements: HasMany<typeof Element>

  @hasMany(() => Fence)
  declare fences: HasMany<typeof Fence>

  @hasMany(() => Vertex)
  declare vertices: HasMany<typeof Vertex>

  @hasMany(() => History)
  declare histories: HasMany<typeof History>

  @manyToMany(() => Objective, {
    pivotTable: 'plan_objectives',
    pivotColumns: ['completionPercentage', 'targetValue'],
  })
  declare objectives: ManyToMany<typeof Objective>

  // Methods _________________________________________________________________
  async getUserPlanNumber() {
    // Find all plans for this user, ordered by creation date
    const userPlans = await Plan.query().where('userId', this.userId).orderBy('createdAt', 'asc')

    // Find this plan's position in the array (adding 1 since positions start at 1)
    return userPlans.findIndex((plan) => plan.id === this.id) + 1
  }

  // Add a method to find a plan by its position for a user
  static async findByUserPosition(userId: number, position: number) {
    const plan = await Plan.query()
      .where('userId', userId)
      .orderBy('createdAt', 'asc')
      .offset(position - 1)
      .limit(1)
      .firstOrFail()

    return plan
  }
}
