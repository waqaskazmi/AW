const express = require("express");
const drugController = require("../controllers/drugController");
const router = express.Router();

router.post("/", drugController.postDrug);
router.get("/", drugController.getDrugs);
router.get("/:id", drugController.getDrug);
router.post("/update", drugController.updateDrug);
router.post("/delete", drugController.deleteDrug);

module.exports = router;
