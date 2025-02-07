import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'objectives'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('name', 50).notNullable()
      table.string('description', 255).notNullable()
      table.integer('goal').notNullable()
      table.string('unit', 20).notNullable()
      table.integer('perNbChicken').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
