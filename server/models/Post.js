const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
    name: String,
  });
  
  const Topic = mongoose.model('Topic', TopicSchema);

const Schema = mongoose.Schema;
const PostSchema = new Schema({ 
    topic: {
        type: String,
        required: Boolean,
    },
    title: {
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

module.exports = { Topic, Post };
