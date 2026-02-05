import mongoose, { Schema } from 'mongoose';

// Интерфейс вложенного документа сообщения
export interface IMessage {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  sentAt: Date;
  text: string;
  readStatus?: Record<string, Date>;
  toObject?: () => IMessage;
}

// Схема сообщения — привязка к автору и временные метки
export const messageSchema: Schema<IMessage> = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sentAt: { type: Date, default: Date.now },
  text: { type: String, required: true },
  readStatus: { type: Object }
});
