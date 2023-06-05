const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js");
const Blog = require("../models/blogModel.js");
const cloudinary = require("../utils/cloudinary.js");

var populateQuery = [{
    path: "userId",
    model: "User",
},
{
    path: 'blog.comments.user',
    model: "User",
},
{
    path: 'blog.comments.replies.user',
    model: "User",
},
];


const getBlogs = asyncHandler(async (req, res) => {

    let blogs = await Blog.find({}).populate(populateQuery).exec();;

    if (!blogs) return res.status(404).send("No blogs exist!");

    res.send(blogs);
    res.end();
});

const postBlog = asyncHandler(async (req, res) => {

    let { email, blog } = req.body;

    // check if user email exists in db and update
    let user = await User.findOne({ email });
    if (!user) return res.status(404).send("The user doesn't exists!");

    var uploadFeatureImageResult = null;
    if (blog?.feature_image?.imageToBase64 != null) {
        uploadFeatureImageResult = await cloudinary.uploader.upload(blog?.feature_image?.imageToBase64, {
            folder: "blogImagesAWCure",
        });
    }

    var content_ = []

    for (const contentSection of blog.content) {

        var uploadSecImageResult = null;
        if (contentSection?.img?.imageToBase64 != null) {
            uploadSecImageResult = await cloudinary.uploader.upload(contentSection.img.imageToBase64, {
                folder: "blogImagesAWCure",
            });
        }

        var newContentSec = {
            ...contentSection, img: uploadSecImageResult ? {
                public_id: uploadSecImageResult.public_id,
                url: uploadSecImageResult.secure_url,
            } : null
        }

        content_.push(newContentSec)

    }

    var newBlog = await Blog.create(
        {
            userId: user._id,
            blog: {
                ...blog,
                feature_image: uploadFeatureImageResult ? {
                    public_id: uploadFeatureImageResult.public_id,
                    url: uploadFeatureImageResult.secure_url,
                } : null,
                content: content_
            }
        }
    );

     const  newBlog_ = await Blog.findOne({newBlog}).populate(populateQuery).exec();

    res.send(newBlog_);
    res.end();
});

const updateBlog = asyncHandler(async (req, res) => {

    let { email, blog, deletedSecImages } = req.body;
    let { id } = req.params;

    // check if user email exists in db and update
    let user = await User.findOne({ email });
    if (!user) return res.status(404).send("The user doesn't exist!");

    // check if blog exists in db and update
    let blogObj = await Blog.findOne({ _id: id });
    if (!blogObj) return res.status(404).send("The blog doesn't exist!");


    if (blog?.feature_image?.url == null && blog?.feature_image?.public_id != null ) {
        await cloudinary.uploader.destroy(blog?.feature_image?.public_id, {
            folder: "profileImagesAWCure",
        });
    }

    var uploadFeatureImageResult = null;
    if (blog?.feature_image?.imageToBase64 != null) {

        await cloudinary.uploader.destroy(blog?.feature_image?.public_id, {
            folder: "blogImagesAWCure",
        });

        uploadFeatureImageResult = await cloudinary.uploader.upload(blog?.feature_image?.imageToBase64, {
            folder: "blogImagesAWCure",
        });
    }

    var content_ = []

    for (const contentSection of blog.content) {

        var newContentSec = {...contentSection}

        if (contentSection?.img?.url == null && contentSection?.img?.public_id != null ) {
            await cloudinary.uploader.destroy(contentSection?.img?.public_id, {
                folder: "profileImagesAWCure",
            });
            
            newContentSec  = {
                ...contentSection, 
                img: {
                    public_id: null,
                    url: null,
                }
            }
        }
        
        else if (contentSection?.img?.imageToBase64 != null) {

            
            var uploadSecImageResult = null;

            if(contentSection?.img?.public_id != null){

                await cloudinary.uploader.destroy(contentSection?.img?.public_id, {
                    folder: "blogImagesAWCure",
                });
            }
            
            uploadSecImageResult = await cloudinary.uploader.upload(contentSection.img.imageToBase64, {
                folder: "blogImagesAWCure",
            });

            newContentSec = {
                ...contentSection, img: uploadSecImageResult ? {
                    public_id: uploadSecImageResult.public_id,
                    url: uploadSecImageResult.secure_url,
                } : contentSection?.img
            }
        }
        
        content_.push(newContentSec)
    }

    if(deletedSecImages.length != 0 ){

        for (const img of deletedSecImages) {
    
            if(img.public_id){
                await cloudinary.uploader.destroy(img.public_id, {
                    folder: "blogImagesAWCure",
                });
            }
        }
    }

    var newBlog = await Blog.findOneAndUpdate(
        { _id : blogObj._id },
        {
            userId: user._id,
            blog: {
                ...blog,
                feature_image: uploadFeatureImageResult ? {
                    public_id: uploadFeatureImageResult.public_id,
                    url: uploadFeatureImageResult.secure_url,
                } : blog.feature_image,
                content: content_
            }
        }, { returnOriginal: false }
    ).populate(populateQuery).exec();

    res.send(newBlog);
    res.end();
});

const updateBlogByUser = asyncHandler(async (req, res) => {

    let {id, email, like, comment, comment_id, reply, delete_comment_id, delete_reply_id } = req.body;

    // check if user email exists in db and update
    let user = await User.findOne({ email });
    if (!user) return res.status(404).send("The user doesn't exist!");

    // check if blog exists in db and update
    let blogObj = await Blog.findOne({ _id: id });
    if (!blogObj) return res.status(404).send("The blog doesn't exist!");

    if(delete_reply_id != null){

        var newBlog = await Blog.findOneAndUpdate(
            { _id : blogObj._id },
            {
              $pull: { "blog.comments.$[element].replies": { _id: delete_reply_id }}
            },
            {
              arrayFilters: [
                {
                  "element._id": comment_id,
                },
              ],
              returnOriginal: false
            }
          )
    }

    if(delete_comment_id != null){
        
        var newBlog = await Blog.findOneAndUpdate(
            { _id : blogObj._id },
            {
              $pull: { "blog.comments": { _id: delete_comment_id }}
            },
            {
              returnOriginal: false
            }
          )
    }

    if(reply != null){

        var newBlog = await Blog.findOneAndUpdate(
            { _id : blogObj._id },
            {
              $push: { "blog.comments.$[element].replies": { reply, user: user._id }}
            },
            {
              arrayFilters: [
                {
                  "element._id": comment_id,
                },
              ],
              returnOriginal: false
            }
          )
    }

    if(like != null){

        if( like == true ){

            var newBlog = await Blog.findOneAndUpdate(
                { _id : blogObj._id },
                {
                  $push: {"blog.likes.users": { _id : user._id } },
                  $set: { "blog.likes.count" : blogObj.blog.likes.count + 1}
                },
                { returnOriginal: false }
              ).populate(populateQuery)
                .exec();
        }
        else if( like == false ){

            var newBlog = await Blog.findOneAndUpdate(
                { _id : blogObj._id },
                {
                  $pullAll: {"blog.likes.users":  [user._id] },
                  $set: { "blog.likes.count" : blogObj.blog.likes.count - 1}
                },
                { returnOriginal: false }
              ).populate(populateQuery)
                .exec();
        }   
    }

    if(comment != null){

        var newBlog = await Blog.findOneAndUpdate(
            { _id : blogObj._id },
            {
              $push: { "blog.comments" : { comment, user: user._id }},
            },
            { returnOriginal: false }
          ).populate(populateQuery)
            .exec();;
    }

    let blogs = await Blog.find({}).populate(populateQuery)
        .exec();;

    res.send(blogs);
    res.end();
});

module.exports = {
    getBlogs,
    postBlog,
    updateBlog,
    updateBlogByUser,
};
