import { BaseModel, column, hasMany, belongsTo, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
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
  @hasMany(() => Fence, {
    foreignKey: 'vertexStartId',
  })
  declare startFences: HasMany<typeof Fence>

  @hasMany(() => Fence, {
    foreignKey: 'vertexEndId',
  })
  declare endFences: HasMany<typeof Fence>

  @hasOne(() => Element)
  declare elements: HasOne<typeof Element>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>
}
