const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const jobSchema = new Schema({
    job_name: {
      type: String,
      required: true
    },
    works: [
      {
        name: String,
        status: Boolean
      }
    ]
  });

module.exports = mongoose.model('Job', jobSchema);
  
