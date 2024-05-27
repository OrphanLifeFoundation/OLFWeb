const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    name: {
        type: String,
        required: Boolean,
    },
    position: {
        type: String,
        required: Boolean,
    },
    image: {
        data: Buffer, 
        contentType: String, 
        required: Boolean, 
      }, 
  });
  
  // Create a Faq model based on the schema
  const Faq = mongoose.model('Faq', faqSchema);
  
  module.exports = { Faq }; 