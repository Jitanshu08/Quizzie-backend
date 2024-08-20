const mongoose = require("mongoose");

// Defining the schema for a question
const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOption: {
    type: Number,
    required: function () {
      return this.quizType === "Q&A";
    },
  },
  timer: { type: Number }, // Timer in seconds, optional
  type: { type: String, enum: ["Q&A", "Poll"], required: true },
});

// Defining the schema for a quiz
const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  questions: {
    type: [questionSchema],
    validate: [questionsLimit, "Quiz cannot have more than 5 questions"],
  },
  quizStructure: {
    type: String,
    enum: ["Single Question", "Multiple Questions"],
    required: true,
  },
  quizCategory: { type: String, enum: ["Q&A", "Poll"], required: true },
  impressions: { type: Number, default: 0 },
  isTrending: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Custom validation function to limit the number of questions to 5
function questionsLimit(val) {
  return val.length <= 5;
}

// Middleware to update the 'isTrending' status
quizSchema.pre("save", function (next) {
  if (this.impressions > 10) {
    this.isTrending = true;
  }
  next();
});

module.exports = mongoose.model("Quiz", quizSchema);
