const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const CommentSchema = new Schema({
    comment: {
        type: String,
        required: true,
    },
    author: {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post', // Reference to the post this comment belongs to
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment', // Reference to the parent comment if it's a reply
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Comment', CommentSchema);
