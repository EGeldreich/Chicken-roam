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
      table.integer('per_nb_chicken').notNullable()
    })
    await this.db.table(this.tableName).multiInsert([
      {
        name: 'area',
        description: 'Total area needed per chicken',
        goal: 15,
        unit: 'm²',
        per_nb_chicken: 1,
      },
      {
        name: 'perch',
        description: 'Perch length needed per chicken',
        goal: 20,
        unit: 'cm',
        per_nb_chicken: 1,
      },
      {
        name: 'shelter',
        description: 'Shelter area needed for 10 chickens',
        goal: 3,
        unit: 'm²',
        per_nb_chicken: 10,
      },
      {
        name: 'shrubs',
        description: 'Edible shrubs needed for 10 chickens',
        goal: 3,
        unit: 'shrubs',
        per_nb_chicken: 10,
      },
      {
        name: 'insectary',
        description: 'Insect-hosting structures needed for 5 chickens',
        goal: 1,
        unit: 'structure',
        per_nb_chicken: 5,
      },
      {
        name: 'dustbath',
        description: 'Dust bath area needed for 10 chickens',
        goal: 3,
        unit: 'm²',
        per_nb_chicken: 10,
      },
      {
        name: 'waterer',
        description: 'Water points needed for 5 chickens',
        goal: 1,
        unit: 'water point',
        per_nb_chicken: 5,
      },
    ])
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
