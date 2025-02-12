import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Plan from './plan.js'
import Vertex from './vertex.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Fence extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare vertexStartId: number

  @column()
  declare vertexEndId: number

  @column()
  declare type: string

  @column()
  declare description: string | null

  //Relationships
  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  @belongsTo(() => Vertex, {
    foreignKey: 'vertexStartId',
  })
  declare vertexStart: BelongsTo<typeof Vertex>

  @belongsTo(() => Vertex, {
    foreignKey: 'vertexEndId',
  })
  declare vertexEnd: BelongsTo<typeof Vertex>
}
