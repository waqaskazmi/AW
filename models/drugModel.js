const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const drugSchema = new Schema({

    title: {
        type: String,
        required: true,
    },

    image:
    {
        public_id: { type: String },
        url: { type: String },
    },

    price: { type: Number },

    description: { type: String },

    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("drug", drugSchema);
