import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn('Calls', 'idempotencyKey', {
    type: DataTypes.STRING(128),
    allowNull: true,
  });
  await queryInterface.addColumn('Calls', 'dispatchState', {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'pending',
  });
  await queryInterface.addColumn('Calls', 'dispatchStartedAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await queryInterface.addColumn('Calls', 'providerCallId', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn('Calls', 'conversationId', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn('Calls', 'sipCallId', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addIndex('Calls', ['tenantId', 'idempotencyKey'], {
    name: 'calls_tenant_idempotency_unique',
    unique: true,
  });
  await queryInterface.addIndex('Calls', ['tenantId', 'dispatchState', 'executed'], {
    name: 'calls_dispatch_queue_idx',
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeIndex('Calls', 'calls_dispatch_queue_idx');
  await queryInterface.removeIndex('Calls', 'calls_tenant_idempotency_unique');
  await queryInterface.removeColumn('Calls', 'sipCallId');
  await queryInterface.removeColumn('Calls', 'conversationId');
  await queryInterface.removeColumn('Calls', 'providerCallId');
  await queryInterface.removeColumn('Calls', 'dispatchStartedAt');
  await queryInterface.removeColumn('Calls', 'dispatchState');
  await queryInterface.removeColumn('Calls', 'idempotencyKey');
}
