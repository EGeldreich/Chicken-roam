import { BaseModel, column, hasMany, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Fence from './fence.js'
import Element from './element.js'
import Plan from './plan.js'

export default class Vertex extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare positionX: number

  @column()
  declare positionY: number

  // RelationShips
  @hasMany(() => Fence)
  declare fences: HasMany<typeof Fence>

  @manyToMany(() => Element, {
    pivotTable: 'element_vertices',
    pivotColumns: ['vertexOrder'],
  })
  declare elements: ManyToMany<typeof Element>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>
}
