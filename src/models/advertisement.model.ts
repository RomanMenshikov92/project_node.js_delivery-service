import mongoose, { Document, Model, Schema } from 'mongoose';

// Интерфейс документа объявления
export interface IAdvertisement extends Document {
  _id: mongoose.Types.ObjectId;
  shortText: string;
  description?: string;
  images?: string[];
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  isDeleted: boolean;
}

// Схема объявления — поддержка soft delete через флаг isDeleted
const advertisementSchema: Schema<IAdvertisement> = new Schema(
  {
    shortText: { type: String, required: true },
    description: { type: String },
    images: [{ type: String }],
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String }],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Коллекция объявлений
const Advertisement: Model<IAdvertisement> = mongoose.model<IAdvertisement>(
  'Advertisement',
  advertisementSchema,
);
export default Advertisement;
