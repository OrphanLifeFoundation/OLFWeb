const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ProjectSchema = new Schema({
    name: {
        type: String,
        required: Boolean,
    },
    profession: {
        type: String,
        required: Boolean,
    },
    testimony: {
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