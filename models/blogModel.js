const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    blog: {

        title: {
            type: String,
            required: true,
        },
        feature_image:
        {
            public_id: { type: String },
            url: { type: String },
        },
        content: [
            {
                heading: { type: String },
                img: {
                    public_id: { type: String },
                    url: { type: String },
                },
                text: { type: String }
            }
        ],
        likes: {
            count: {
                type: Number,
                default: 0
            },
            users: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                }
            ]
        },
        comments: [
            {
                comment: { type: String },
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                replies: [
                    {
                        reply: { type: String },
                        user: {
                            type: Schema.Types.ObjectId,
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
        ]

    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("blog", blogSchema);
