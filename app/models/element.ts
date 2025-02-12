import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Plan from './plan.js'
import Vertex from './vertex.js'

export default class Element extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare type: string

  @column()
  declare objectiveValue: number

  @column()
  declare description: string | null

  // Relationships
  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  @manyToMany(() => Vertex, {
    pivotTable: 'element_vertices',
    pivotColumns: ['vertexOrder'],
  })
  declare vertices: ManyToMany<typeof Vertex>
}
