import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'elements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('type', 50).notNullable()
      table.integer('objective_value').notNullable()
      table.string('description', 255)
      table.integer('plan_id').unsigned().references('id').inTable('plans').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
