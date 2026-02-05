import mongoose, { Document, Model, Schema } from 'mongoose';
import { type IMessage, messageSchema } from '../models/message.model.js';

// Интерфейс документа чата
export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  users: [mongoose.Types.ObjectId, mongoose.Types.ObjectId];
  createdAt: Date;
  messages: IMessage[];
}

// Схема чата — валидация двух участников
const chatSchema: Schema<IChat> = new Schema(
  {
    users: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    messages: [messageSchema],
  },
  {
    timestamps: true,
  },
);

// Валидация массива пользователей
chatSchema.pre('validate', function () {
  if (this.users && this.users.length !== 2) {
    this.invalidate('users', 'Array must contain exactly 2 users');
  }
});

// Коллекция чатов
const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
