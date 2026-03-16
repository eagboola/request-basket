import mongoose from "mongoose";

const { Schema } = mongoose;

export const requestSchema = new Schema({
  endpoint: String,
  method: String,
  headers: { type: Map, of: Schema.Types.Mixed },
  body: Schema.Types.Mixed,
});
