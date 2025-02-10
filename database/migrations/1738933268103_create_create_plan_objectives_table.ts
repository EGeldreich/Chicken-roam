import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'create_plan_objectives'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('planId').unsigned().references('id').inTable('plans').onDelete('CASCADE')
      table
        .integer('objectiveId')
        .unsigned()
        .references('id')
        .inTable('objectives')
        .onDelete('CASCADE')
      table.integer('completionPercentage').defaultTo('0').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
