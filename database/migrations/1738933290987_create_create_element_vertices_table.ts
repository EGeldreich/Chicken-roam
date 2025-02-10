import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'create_element_vertices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('elementId').unsigned().references('id').inTable('elements').onDelete('CASCADE')
      table.integer('vertexId').unsigned().references('id').inTable('vertices').onDelete('CASCADE')
      table.integer('vertexOrder').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
