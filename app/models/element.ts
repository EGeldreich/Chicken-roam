import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Plan from './plan.js'
import Vertex from './vertex.js'

export default class Element extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare vertexId: number

  @column()
  declare type: string

  @column()
  declare objectiveValue: number

  @column()
  declare width: number

  @column()
  declare height: number

  @column()
  declare description: string | null

  // Relationships
  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  @belongsTo(() => Vertex)
  declare vertex: BelongsTo<typeof Vertex>
}
