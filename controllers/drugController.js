const asyncHandler = require("express-async-handler");
const Drug = require("../models/drugModel.js");
const User = require("../models/userModel.js");
const cloudinary = require("../utils/cloudinary.js");

const getDrugs = asyncHandler(async (req, res) => {

    let drugs = await Drug.find({})

    if (!drugs) return res.status(404).send("No Drugs exist!");

    res.send(drugs);
    res.end();
});

const getDrug = asyncHandler(async (req, res) => {
    let { id } = req.params;

    let drug = await Drug.findOne({_id: id})

    if (!drug) return res.status(404).send("Drug not found!");

    res.send(drug);
    res.end();
});

const postDrug = asyncHandler(async (req, res) => {

    let { admin_email, drug } = req.body;

    // check if user email exists in db and update

    let admin = await User.findOne({ email: admin_email });

    if (!admin) return res.status(404).send("The admin doesn't exists!");

    var uploadDrugImageResult = null;
    if (drug?.image?.imageToBase64 != null) {
        uploadDrugImageResult = await cloudinary.uploader.upload(drug?.image?.imageToBase64, {
            folder: "drugImagesAWCure",
        });
    }

    var newDrug = await Drug.create(
        {
            ...drug,
            image: uploadDrugImageResult ? {
                public_id: uploadDrugImageResult.public_id,
                url: uploadDrugImageResult.secure_url,
            } : null,
        }
    );

    res.send(newDrug);
    res.end();
});

const updateDrug = asyncHandler(async (req, res) => {

    let { admin_email, drug } = req.body;

    // check if user email exists in db and update
    let admin = await User.findOne({ email: admin_email });

    if (!admin) return res.status(404).send("The admin doesn't exists!");

    // check if blog exists in db and update
    let drugObj = await Drug.findOne({ _id: drug._id });
    if (!drugObj) return res.status(404).send("The drug doesn't exist!");


    if (drug?.image?.url == null && drug?.image?.public_id != null) {
        await cloudinary.uploader.destroy(drug?.image?.public_id, {
            folder: "drugImagesAWCure",
        });
    }

    var uploadDrugImageResult = null;
    if (drug?.image?.imageToBase64 != null) {

        await cloudinary.uploader.destroy(drug?.image?.public_id, {
            folder: "drugImagesAWCure",
        });

        uploadDrugImageResult = await cloudinary.uploader.upload(drug?.image?.imageToBase64, {
            folder: "drugImagesAWCure",
        });
    }


    var newDrug = await Drug.findOneAndUpdate(
        { _id: drugObj._id },
        {
            ...drug,
            image: uploadDrugImageResult ? {
                public_id: uploadDrugImageResult.public_id,
                url: uploadDrugImageResult.secure_url,
            } : null,

        }, { returnOriginal: false }
    )

    res.send(newDrug);
    res.end();
});

const deleteDrug = asyncHandler(async (req, res) => {

    let { admin_email, drug } = req.body;

    let admin = await User.findOne({ email: admin_email });

    if (!admin) return res.status(404).send("The admin doesn't exists!");

    const drugObj = await Drug.findById(drug._id);

    if (drugObj) {
      try {
        drugObj.remove();
      } catch (ex) {

        for (field in ex.errors) {
          res.status(400).send({ message: ex.errors[field].message });
        }
        res.end();
        return;
      }
    } else {
      return res.status(404).send({ message: "Drug not found" });
    }
    res.status(200).send({ message: "Drug deleted successfully! " });
    res.end();
});

module.exports = {
    getDrugs,
    getDrug,
    postDrug,
    updateDrug,
    deleteDrug,
};
