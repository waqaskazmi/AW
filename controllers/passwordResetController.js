const User = require("../models/userModel.js");
const Token = require("../models/tokenModel");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const Joi = require("joi");
const asyncHandler = require("express-async-handler");

const requestResetPasswordLink = asyncHandler(async (req, res) => {
  try {
    const schema = Joi.object({ email: Joi.string().email().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res
        .status(400)
        .send({ message: "user with given email doesn't exist" });

    let token = await Token.findOne({ userId: user._id });
    if (!token) {
      token = await new Token({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
    }

    const link = `${process.env.BASE_URL}/password-reset/${user._id}/${token.token}`;
    const emailSent = await sendEmail(user.email, "Password reset", link);

    if (emailSent == "error") {
      res.status(502).send({ message: "Sorry, failed to send your email!" });
      res.end();
    } else {
      res.send({ success: "password reset link sent to your email account" });
      res.end();
    }
  } catch (error) {
    res.status(502).send({ message: "An error occured" });
    res.end();
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  try {
    const schema = Joi.object({ password: Joi.string().required() });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const user = await User.findById(req.params.userId);
    if (!user)
      return res
        .status(400)
        .send({ message: "Reset password link is invalid or expired" });

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });
    if (!token)
      return res
        .status(400)
        .send({ message: "Reset password link is invalid or expired" });

    user.password = req.body.password;
    await user.save();
    await token.delete();

    res.send({ success: "Your password has been reset successfully!" });
    res.end();
  } catch (error) {
    res
      .status(400)
      .send({ message: "Reset password link is invalid or expired" });
    res.end();
  }
});

module.exports = {
  requestResetPasswordLink,
  resetPassword,
};
