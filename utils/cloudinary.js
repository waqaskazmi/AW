const cloudinary = require("cloudinary").v2;

// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_KEY,
//   api_secret: process.env.CLOUD_SECRET,
// });

// Configuration 
cloudinary.config({
  cloud_name: "dgxopmrhc",
  api_key: "452716112379321",
  api_secret: "cbrhpdOM1aAXEakoWqXuKDJyzNc"
});

module.exports = cloudinary;
