const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    minlength: 5,
    maxlength: 25,
    lowercase: true,
    unique: true,
    required: true,
    index: true,
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: true,
    index: true,
  },
  password: { type: String, required: true },
  gender: { type: String, required: true },
  user_type: { type: String, required: true },
  mobile: { type: String },
  address: { type: String },
  image: {
    public_id: { type: String },
    url: { type: String },
  },
  is_verified: { type: Boolean },
  documents: [{ public_id: { type: String }, url: { type: String } }],
  status: { type: String, default: "Active" },
  warnings: [
    {
      warning: { type: String },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      replies: [
        {
          reply: { type: String },
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        }
      ],
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],
  complaints: [
    {
      title: { type: String },
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      image: {
        public_id: { type: String },
        url: { type: String },
      },
      text: { type: String },
      status: { type: String, default: 'Not Resolved' },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],
  orders: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      paymentMethod: { type: String },
      isPaid: {type: Boolean, default: false},
      orderItems: [
        {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Drug"
          },
          quantity: { type: Number },
          amount: { type: Number },

        },
        
      ],
      total: { type: Number },
      status: { type: String, default: 'Not Delivered' },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],
 
});

userSchema.pre("save", async function save(next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

userSchema.methods.validatePassword = async function validatePassword(data) {
  const result = await bcrypt.compare(data, this.password);
  return result;
};

const User = new mongoose.model("User", userSchema);

module.exports = User;
