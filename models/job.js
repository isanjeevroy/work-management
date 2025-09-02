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
  ],
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

module.exports = mongoose.model('Job', jobSchema);

