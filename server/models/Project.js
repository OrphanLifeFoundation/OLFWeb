const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ProjectSchema = new Schema({
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
        data: Buffer, // Binary image data
        contentType: String, // MIME type of the image
        required: Boolean, // Add required property for the image field
    }
});


module.exports = mongoose.model('Project', ProjectSchema);