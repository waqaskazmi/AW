const express = require("express");
const passwordResetController = require("../controllers/passwordResetController");
const router = express.Router();

router.post("/", passwordResetController.requestResetPasswordLink);
router.post("/:userId/:token", passwordResetController.resetPassword);

module.exports = router;
