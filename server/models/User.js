const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const UserSchema = new Schema({
    username: {
        type: String,
        required: Boolean,
        unique:true,
    },
    email: {
        type: String,
        required: Boolean,
        unique:true,
    },
    password: {
        type: String,
        required: Boolean
    },
    isAdmin: { type: Boolean, default: false }
});


module.exports = mongoose.model('User', UserSchema);