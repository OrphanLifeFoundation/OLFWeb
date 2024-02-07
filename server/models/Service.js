const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ServiceSchema = new Schema({
    title: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    },
    body: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    },
    preview: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    }
});



module.exports = mongoose.model('Service', ServiceSchema);