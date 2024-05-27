const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const PostSchema = new Schema({ 
    title: {
        type: String,
        required: Boolean,
    },
    target: {
        type: String,
        required: Boolean,
    },
    raised: {
        type: String,
        required: Boolean,
    },
    percentage: {
        type: String,
        required: Boolean,
    },
    body: {
        type: String,
        required: Boolean,
    },
    preview: {
        type: String,
        required: Boolean,
    },
    image: {
        data: Buffer, 
        contentType: String, 
        required: Boolean, 
      },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Post = mongoose.model('Post', PostSchema);

module.exports = { Post };
