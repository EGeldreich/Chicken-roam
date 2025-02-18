import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'elements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('type', 50).notNullable()
      table.integer('objective_value').notNullable()
      table.integer('width').notNullable()
      table.integer('height').notNullable()
      table.string('description', 255)
      table.integer('plan_id').unsigned().references('id').inTable('plans').onDelete('CASCADE')
      table.integer('vertex_id').unsigned().references('id').inTable('vertices').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
