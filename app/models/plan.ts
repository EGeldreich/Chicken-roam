import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
// import db from '@adonisjs/lucid/services/db'
import User from './user.js'
import Fence from './fence.js'
import Objective from './objective.js'
import Vertex from './vertex.js'
import History from './history.js'
import Element from './element.js'

export enum PlanState {
  CONSTRUCTION = 'construction',
  ENCLOSED = 'enclosed',
  BROKEN = 'broken',
}

export default class Plan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number | null

  @column()
  declare name: string

  @column()
  declare state: PlanState

  @column()
  declare nbChickens: number

  @column()
  declare isTemporary: boolean

  @column()
  declare isEnclosed: boolean

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
    pivotColumns: ['completion_percentage', 'target_value'],
  })
  declare objectives: ManyToMany<typeof Objective>

  // Methods _________________________________________________________________
}
