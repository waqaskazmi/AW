const express = require("express");
const blogController = require("../controllers/blogController");
const router = express.Router();

router.post("/post", blogController.postBlog);
router.put("/:id", blogController.updateBlog);
router.post("/updateByUser", blogController.updateBlogByUser);
router.get("/", blogController.getBlogs);

module.exports = router;
