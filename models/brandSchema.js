const mongoose = require("mongoose");

const Schema = mongoose.Schema;   
const brandSchema = new Schema({
  brandName: {
    type: String,
    required: true,
    unique:true
  },
  brandImage: {
    type: String,   
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

brandSchema.index(
  { brandName: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Brand = mongoose.model("Brand", brandSchema);
module.exports = Brand;
