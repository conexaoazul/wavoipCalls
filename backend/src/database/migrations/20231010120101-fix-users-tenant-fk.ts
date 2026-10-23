import { QueryInterface, DataTypes } from 'sequelize';

async function hasUsersTenantForeignKey(queryInterface: QueryInterface): Promise<boolean> {
  const [rows]: any = await queryInterface.sequelize.query(`
    SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_name = 'Users'
       AND kcu.column_name = 'tenantId'
       AND ccu.table_name = 'Tenants'
       AND ccu.column_name = 'id'
     LIMIT 1
  `);
  return rows.length > 0;
}

export async function up(queryInterface: QueryInterface) {
  const users = await queryInterface.describeTable('Users');
  if (!(users as any).tenantId) {
    throw new Error('Users.tenantId is missing; refusing to synthesize schema out of order');
  }

  // Refuse to hide legacy data quality problems. Existing rows must already
  // have tenant ownership before the column becomes NOT NULL.
  const [nullRows]: any = await queryInterface.sequelize.query(
    'SELECT COUNT(*)::int AS count FROM "Users" WHERE "tenantId" IS NULL'
  );
  if (Number(nullRows?.[0]?.count || 0) > 0) {
    throw new Error('Users contains rows without tenantId; backfill explicitly before migration');
  }

  await queryInterface.changeColumn('Users', 'tenantId', {
    type: DataTypes.INTEGER,
    allowNull: false,
  });

  if (!(await hasUsersTenantForeignKey(queryInterface))) {
    await queryInterface.addConstraint('Users', ['tenantId'], {
      type: 'foreign key',
      name: 'users_tenant_id_fk',
      references: {
        table: 'Tenants',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  }
}

export async function down(queryInterface: QueryInterface) {
  const [rows]: any = await queryInterface.sequelize.query(`
    SELECT 1
      FROM information_schema.table_constraints
     WHERE table_name = 'Users'
       AND constraint_name = 'users_tenant_id_fk'
     LIMIT 1
  `);
  if (rows.length > 0) {
    await queryInterface.removeConstraint('Users', 'users_tenant_id_fk');
  }

  await queryInterface.changeColumn('Users', 'tenantId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
}
