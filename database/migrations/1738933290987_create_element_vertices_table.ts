import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'element_vertices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('element_id')
        .unsigned()
        .references('id')
        .inTable('elements')
        .onDelete('CASCADE')
      table.integer('vertex_id').unsigned().references('id').inTable('vertices').onDelete('CASCADE')
      table.integer('vertex_order').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
