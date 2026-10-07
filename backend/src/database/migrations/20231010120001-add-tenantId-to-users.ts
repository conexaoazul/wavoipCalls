import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  // Historical ordering has this migration before create-tenants.
  // Keep the filename stable for databases that already recorded it in SequelizeMeta,
  // but avoid referencing a table that does not exist on a clean install.
  const tables = (await queryInterface.showAllTables()).map((table: any) =>
    typeof table === 'string' ? table : String(table.tableName || table.name || table)
  );
  const tenantsExist = tables.includes('Tenants');

  await queryInterface.addColumn('Users', 'tenantId', {
    type: DataTypes.INTEGER,
    // A clean database has no users yet. The follow-up migration, which runs
    // after Tenants exists, makes this NOT NULL and adds the foreign key.
    allowNull: !tenantsExist,
    ...(tenantsExist ? {
      references: {
        model: 'Tenants',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    } : {}),
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn('Users', 'tenantId');
}
