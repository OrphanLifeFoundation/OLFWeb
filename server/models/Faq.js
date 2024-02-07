const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    qstn: String,
    description: [String],
    ans: [String]
  });
  
  // Create a Faq model based on the schema
  const Faq = mongoose.model('Faq', faqSchema);
  
  module.exports = { Faq }; 