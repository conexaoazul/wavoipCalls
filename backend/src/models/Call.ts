import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Tenant from './Tenant';
import VapiToken from './VapiToken';
import ElevenLabToken from './ElevenLabToken';

@Table
class Call extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  customerNumber!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  assistantId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  phoneNumberId!: string;

  @Column({
    type: DataType.STRING(128),
    allowNull: true,
  })
  idempotencyKey?: string;

  @Column({
    type: DataType.STRING(16),
    allowNull: false,
    defaultValue: 'pending',
  })
  dispatchState!: 'pending' | 'dispatching' | 'completed' | 'failed' | 'unknown';

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  dispatchStartedAt?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  providerCallId?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  conversationId?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  sipCallId?: string;

  @ForeignKey(() => VapiToken)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  vapiTokenId?: number;

  @ForeignKey(() => ElevenLabToken)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  elevenLabTokenId?: number;

  @ForeignKey(() => Tenant)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  tenantId!: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  executed!: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updatedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  scheduleAt!: Date;

  @BelongsTo(() => VapiToken)
  vapiToken?: VapiToken;

  @BelongsTo(() => ElevenLabToken)
  elevenLabToken?: ElevenLabToken;

  @BelongsTo(() => Tenant)
  tenant!: Tenant;
}

export default Call;
