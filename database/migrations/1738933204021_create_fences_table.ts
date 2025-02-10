import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('type', 50).notNullable()
      table.string('description', 255)
      table
        .integer('vertexEndId')
        .unsigned()
        .references('id')
        .inTable('vertices')
        .onDelete('CASCADE')
      table
        .integer('vertexStartId')
        .unsigned()
        .references('id')
        .inTable('vertices')
        .onDelete('CASCADE')
      table.integer('planId').unsigned().references('id').inTable('plans').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
