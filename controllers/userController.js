const Joi = require("joi");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const Token = require("../models/tokenModel");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/userModel.js");
const generateToken = require("../utils/generateToken.js");
const cloudinary = require("../utils/cloudinary.js");
var fs = require("fs");

const path = require("path");

function validateUser(user) {
  const schema = Joi.object({
    username: Joi.string().min(5).required(),
    email: Joi.string().email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net"] },
    }),
    password: Joi.string().min(5),
    gender: Joi.string(),
    user_type: Joi.string(),
    address: Joi.string().min(5),
    mobile: Joi.string().min(5),
    image: Joi.string().allow(null),
    previous_image_id: Joi.string().allow(null),
    imageUrl: Joi.string().allow(null),
  });

  return schema.validate(user);
}


var populateQuery = [
  {
    path: 'warnings.user',
    model: "User",
  },
  {
    path: 'warnings.replies.user',
    model: "User",
  },
  {
    path: 'complaints.to',
    model: "User",
  },
  {
    path: 'complaints.from',
    model: "User",
  },
  {
    path: 'orders.user',
    model: "User",
  },
];


const getAllUsers = asyncHandler(async (req, res) => {

  // req.user was set in authMiddleware.js
  // const user = await User.findById(req.user._id);

    const allUsers = await User.find({}).populate(populateQuery)
      .exec();

    res.json(allUsers)
});

const registerUser = asyncHandler(async (req, res) => {
  const { error } = validateUser(req.body);

  if (error) {
    res.status(400).send(error.details[0].message);
    return;
  }

  let { email, username } = req.body;

  // check if user email exists in db
  var userAlreadyExist = await User.findOne({ $or: [{ email }, { username }] });

  if (userAlreadyExist) {
    return res.status(403).send({ message: "The user already exists!" });
  }

  try {
    var user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      gender: req.body.gender,
      user_type: req.body.user_type,
      is_verified: false,
      documents: [],
    });

    user = await user.save();
  } catch (ex) {
    console.log("in catch", ex);
    for (field in ex.errors) {
      res.status(400).send(ex.errors[field].message);
    }
    res.end();
    return;
  }

  res.status(201).send(user);
  res.end();
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // check if user email exists in db
  const user = await User.findOne({ email });

  if (!user)
    return res.status(404).send({ message: "The user doesn't exists!" });

  // return user obj if their password matches
  const isMatch = await user.validatePassword(password);
  if (!isMatch) {
    res.status(401).send({ message: "Password is incorrect!" });
    return;
  }

  if (user.status == 'Blocked') {
    res.status(401).send({ message: "Your account is blocked due to some reason! Please contact awcure@gmail.com for help!" });
    return;
  }

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    userToken: generateToken(user._id),
  });
});

const getUserProfile = asyncHandler(async (req, res) => {
  // req.user was set in authMiddleware.js
  const user = await User.findById(req.user._id).populate(populateQuery)
    .exec();

  if (user) {
    res.send({
      id: user._id,
      username: user.username,
      email: user.email,
      gender: user.gender,
      user_type: user.user_type,
      mobile: user.mobile,
      address: user.address,
      image: user.image,
      documents: user.documents,
      is_verified: user.is_verified,
      status: user.status,
      warnings: user.warnings,
      complaints:user.complaints,
      orders:user.orders,

    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const updateProfile = asyncHandler(async (req, res) => {
  // const { error } = validateUser(req.body);
  // if (error) {
  //   res.status(400).send({ message: error.details[0].message });
  //   return;
  // }

  let { email, gender, image, previous_image_id, imageUrl, warning, admin_email, delete_warning_id, delete_reply_id, warning_id, reply, block, complaint,
    complaintId,
    complaintStatus,
    order,
    order_id,
    order_status,
    delete_order,
    isPaid
 } = req.body;

  // check if user email exists in db and update

  let user = await User.findOne({ email });

  if (!user) return res.status(404).send("The user doesn't exists!");

  var uploadImageResult = null;
  if (image != null) {
    uploadImageResult = await cloudinary.uploader.upload(image, {
      folder: "profileImagesAWCure",
    });
  }
  if (imageUrl != user.image.url && previous_image_id != null) {
    await cloudinary.uploader.destroy(previous_image_id, {
      folder: "profileImagesAWCure",
    });
  }

  if (complaintId != null && complaintStatus != null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $set: { "complaints.$[element].status": complaintStatus == true ? 'Resolved' : 'Not Resolved' }
      },
      {
        arrayFilters: [
          {
            "element._id": complaintId,
          },
        ],
        returnOriginal: false
      }
    ).populate(populateQuery)
  }

  else if (block != null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        status: block == true ? 'Blocked' : 'Active'
      },
      {
        returnOriginal: false
      }
    ).populate(populateQuery)
  }

  else if (delete_reply_id != null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $pull: { "warnings.$[element].replies": { _id: delete_reply_id } }
      },
      {
        arrayFilters: [
          {
            "element._id": warning_id,
          },
        ],
        returnOriginal: false
      }
    ).populate(populateQuery)
  }

  else if (delete_warning_id != null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $pull: { warnings: { _id: delete_warning_id } },
        status: user.warnings.length > 1 ? 'Warned' : 'Active'
      },
      { returnOriginal: false }
    ).populate(populateQuery)
  }

  else if (order_id != null && delete_order) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $pull: { orders: { _id: order_id } },
        // status: user.warnings.length > 1 ? 'Warned' : 'Active'
      },
      { returnOriginal: false }
    ).populate(populateQuery)
  }

  else if (order_id != null && isPaid) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $set: { "orders.$[element].isPaid": true }
      },
      {
        arrayFilters: [
          {
            "element._id": order_id,
          }
        ],
        returnOriginal: false
      }
    ).populate(populateQuery)


  }

  else if (order_id != null && order_status != null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $set: { "orders.$[element].status": order_status }
      },
      {
        arrayFilters: [
          {
            "element._id": order_id,
          }
        ],
        returnOriginal: false
      }
    ).populate(populateQuery)


  }

  else if (reply != null && admin_email != null) {

    let admin = await User.findOne({ email: admin_email });

    if (!admin) return res.status(404).send("The admin doesn't exists!");

    user = await User.findOneAndUpdate(
      { email },
      {
        $push: { "warnings.$[element].replies": { reply, user: admin._id } }
      },
      {
        arrayFilters: [
          {
            "element._id": warning_id,
          },
        ],
        returnOriginal: false
      }
    ).populate(populateQuery)

  }

  else if (reply != null && admin_email == null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $push: { "warnings.$[element].replies": { reply, user: user._id } }
      },
      {
        arrayFilters: [
          {
            "element._id": warning_id,
          },
        ],
        returnOriginal: false
      }
    ).populate(populateQuery)
  }

  else if (warning != null) {

    let admin = await User.findOne({ email: admin_email });

    if (!admin) return res.status(404).send("The admin doesn't exists!");

    user = await User.findOneAndUpdate(
      { email },
      {
        $push: { warnings: { warning, user: admin._id } },
        status: "Warned"
      },
      { returnOriginal: false }
    ).populate(populateQuery)
  }

  else if (complaint != null) {

    var uploadComplaintImageResult = null;
    if (complaint?.image?.imageToBase64 != null) {
      uploadComplaintImageResult = await cloudinary.uploader.upload(complaint?.image?.imageToBase64, {
        folder: "complaintImagesAWCure",
      });
    }

    user = await User.findOneAndUpdate(
      { email },
      {
        $push: {
          complaints: {
            ...complaint,
            image: uploadComplaintImageResult ? {
              public_id: uploadComplaintImageResult.public_id,
              url: uploadComplaintImageResult.secure_url,
            } : null
          }
        }
      },
      { returnOriginal: false }
    ).populate(populateQuery)
  }

  else if (order != null) {

    user = await User.findOneAndUpdate(
      { email },
      {
        $push: { orders: order },
      },
      { returnOriginal: false }
    ).populate(populateQuery)
  }

  else {
    user = await User.findOneAndUpdate(
      { email },
      {
        username: req.body.username,
        gender: req.body.gender,
        mobile: req.body.mobile,
        address: req.body.address,
        image: uploadImageResult
          ? {
            public_id: uploadImageResult.public_id,
            url: uploadImageResult.secure_url,
          }
          : imageUrl == user.image.url
            ? user.image
            : null,

      },
      { returnOriginal: false }
    ).populate(populateQuery)
      .exec();
  }

  if (admin_email != null) {
    const allUsers = await User.find({}).populate(populateQuery)
      .exec();
    res.send({ users: allUsers })
    res.end();
  }
  else {
    res.send({ user });
    res.end();
  }

});

const updateDocuments = asyncHandler(async (req, res) => {
  let { email, documents } = req.body;

  // check if user email exists in db and update
  let user = await User.findOne({ email });

  if (!user) return res.status(404).send("The user doesn't exists!");

  var uploadDocResults = [];

  try {
    if (documents.length != 0) {
      for (const doc of documents) {
        const extension = doc?.name.substring(doc?.name.lastIndexOf(".") + 1);

        if (
          extension != "png" &&
          extension != "jpg" &&
          extension != "jpeg" &&
          extension != "pdf"
        ) {
          let base64Image = doc.base64.split(";base64,").pop();
          fs.writeFile(
            doc.name,
            base64Image,
            { encoding: "base64" },
            function (err) {
              console.log("File created");
            }
          );
          doc.base64 = doc.name;
        }

        const uploadDocResult = await cloudinary.uploader.upload(doc.base64, {
          folder: "profileDocumentsAWCure",
          public_id: doc.name.substring(0, doc.name.indexOf(".")),
          resource_type: "raw",
          raw_convert: "aspose",

          resource_type:
            extension != "png" &&
              extension != "jpg" &&
              extension != "jpeg" &&
              extension != "pdf"
              ? "raw"
              : null,
          raw_convert:
            extension != "png" &&
              extension != "jpg" &&
              extension != "jpeg" &&
              extension != "pdf"
              ? "aspose"
              : null,
        });

        if (
          extension != "png" &&
          extension != "jpg" &&
          extension != "jpeg" &&
          extension != "pdf"
        ) {
          fs.unlink(doc.name, function (err) {
            console.log("File removed");
          });
        }
        uploadDocResults.push(uploadDocResult);
      }
    }

    user = await User.findOneAndUpdate(
      { email },
      {
        $push: {
          documents: uploadDocResults.length != 0 ? uploadDocResults : null,
        },
      },
      { returnOriginal: false }
    );

    res.send(user);
    res.end();
  } catch (error) {
    res.status(400).send({ message: error.message });
    return;
  }
});

const removeDocuments = asyncHandler(async (req, res) => {
  let { email, documents } = req.body;

  // check if user email exists in db and update
  let user = await User.findOne({ email });

  if (!user) return res.status(404).send("The user doesn't exists!");

  if (documents.length != 0) {
    for (const doc of documents) {
      await cloudinary.uploader.destroy(doc.public_id, {
        folder: "profileImagesAWCure",
      });
    }
  }

  var removedDocs = documents.map((doc) => doc.public_id);

  user = await User.findOneAndUpdate(
    { email },
    {
      $pull: {
        documents:
          documents.length != 0 ? { public_id: { $in: removedDocs } } : null,
      },
    },
    { returnOriginal: false }
  );

  res.send(user);
  res.end();
});

const removeUser = asyncHandler(async (req, res) => {
  // req.user was set in authMiddleware.js
  const user = await User.findById(req.user._id);

  if (user) {
    try {
      user.remove();
    } catch (ex) {
      console.log("in catch", ex);
      for (field in ex.errors) {
        res.status(400).send({ message: ex.errors[field].message });
      }
      res.end();
      return;
    }
  } else {
    return res.status(404).send({ message: "User not found" });
  }
  res.status(200).send({ message: "User deleted successfully! " });
  res.end();
});

const verifyEmailLink = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user)
    return res
      .status(400)
      .send({ message: "user with given email doesn't exist" });

  try {
    let token = await Token.findOne({ userId: user._id });

    if (!token) {
      token = await new Token({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
    }

    const link = `${process.env.BASE_URL}/verify-account/${user._id}/${token.token}`;
    const emailSent = await sendEmail(user.email, "Verify Account", link);

    if (emailSent == "error") {
      res
        .status(502)
        .send({ message: "Sorry, failed to send you verification link" });
      res.end();
    } else {
      res.send({ success: "verification link sent to your email account" });
      res.end();
    }
  } catch (error) {
    res.status(502).send({ message: "An error occured" });
    res.end();
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user)
      return res
        .status(400)
        .send({ message: "Verification link is invalid or expired" });

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });
    if (!token)
      return res
        .status(400)
        .send({ message: "Verification link is invalid or expired" });

    user.is_verified = true;
    await user.save();
    await token.delete();

    res.send({ success: "Your account has been verified successfully!" });
    res.end();
  } catch (error) {
    res
      .status(400)
      .send({ message: "Verification link is invalid or expired" });
    res.end();
  }
});

module.exports = {
  getAllUsers,
  registerUser,
  loginUser,
  getUserProfile,
  updateProfile,
  removeUser,
  updateDocuments,
  removeDocuments,
  verifyEmailLink,
  verifyEmail,
};
