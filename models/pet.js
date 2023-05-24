const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const petSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String, required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  color: { type: String, required: true },
  bio: { type: String, required: true },
  hypoallergenic: { type: Boolean, required: true },
  dietaryRestrictions: [
    {
      type: String,
    },
  ],
  breed: { type: String, required: true },
  status: {
    type: String,
    enum: ["available", "fostered", "adopted"],
    default: "available",
  },
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  fosteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  adoptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
});

petSchema.pre("save", function (next) {
  if (!this.fosteredBy && !this.adoptedBy) {
    this.status = "available";
  } else if (this.fosteredBy && !this.adoptedBy) {
    this.status = "fostered";
  } else if (!this.fosteredBy && this.adoptedBy) {
    this.status = "adopted";
  }
  next();
});

petSchema.plugin(uniqueValidator);

petSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

module.exports = mongoose.model("Pet", petSchema);
