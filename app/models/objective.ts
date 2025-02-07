import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Plan from './plan.js'

export default class Objective extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare goal: number

  @column()
  declare unit: string

  @column()
  declare perNbChicken: number

  // Relationships
  @manyToMany(() => Plan, {
    pivotTable: 'plan_objectives',
    pivotColumns: ['completionPercentage'],
  })
  declare objectives: ManyToMany<typeof Plan>
}
