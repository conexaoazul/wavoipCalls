import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn('Calls', 'idempotencyKey', {
    type: DataTypes.STRING(128),
    allowNull: true,
  });
  await queryInterface.addColumn('Calls', 'requestFingerprint', {
    type: DataTypes.STRING(64),
    allowNull: true,
  });

  // Existing rows must never become newly dispatchable just because this
  // migration is applied. They enter legacy_hold; only calls created through
  // the hardened path are inserted as pending by CallService.
  await queryInterface.addColumn('Calls', 'dispatchState', {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'legacy_hold',
  });
  await queryInterface.sequelize.query(
    'UPDATE "Calls" SET "dispatchState" = \'legacy_hold\' WHERE "dispatchState" IS NULL OR "dispatchState" = \'pending\''
  );

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
  await queryInterface.removeColumn('Calls', 'requestFingerprint');
  await queryInterface.removeColumn('Calls', 'idempotencyKey');
}
