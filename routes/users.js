const express = require("express");
const protect = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.route("/all").get(protect, userController.getAllUsers);
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.route("/profile").get(protect, userController.getUserProfile);
router.route("/verify-link").get(protect, userController.verifyEmailLink);
router.get("/verify-email/:userId/:token", userController.verifyEmail);
router.route("/remove").delete(protect, userController.removeUser);
router.post("/update", userController.updateProfile);
router.post("/updateDocs", userController.updateDocuments);
router.post("/removeDocs", userController.removeDocuments);

module.exports = router;
