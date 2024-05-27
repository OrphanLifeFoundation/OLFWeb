const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ServiceSchema = new Schema({
    districts: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    },
    volunteers: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    },
    goal: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    },
    raised: {
        type: String,
        required: true, // Fix: Change `Boolean` to `true`
    }
});



module.exports = mongoose.model('Service', ServiceSchema);