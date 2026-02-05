import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Интерфейс документа пользователя
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  contactPhone?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Схема пользователя — валидация и хеширование пароля
const userSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    contactPhone: { type: String },
  },
  {
    timestamps: true,
  },
);

// Метод сравнения пароля — для аутентификации
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Коллекция пользователей
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
