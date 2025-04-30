import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plan_objectives'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('plan_id').unsigned().references('id').inTable('plans').onDelete('CASCADE')
      table
        .integer('objective_id')
        .unsigned()
        .references('id')
        .inTable('objectives')
        .onDelete('CASCADE')
      table.integer('completion_percentage').defaultTo('0').notNullable()
      table.float('current_value').defaultTo('0').notNullable()
      table.integer('target_value').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
