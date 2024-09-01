const mongoose = require("mongoose");

// Schema for an option
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: function () {
      return this.optionType === "Text" || this.optionType === "Text & Image URL";
    },
  },
  imageUrl: {
    type: String,
    required: function () {
      return this.optionType === "Image URL" || this.optionType === "Text & Image URL";
    },
  },
});

// Schema for a question
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Q&A", "Poll"],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  options: [optionSchema], // Update to use optionSchema
  correctOption: {
    type: Number,
    required: function () {
      return this.type === "Q&A";
    },
  },
  optionType: {
    type: String,
    enum: ["Text", "Image URL", "Text & Image URL"],
    required: true,
  },
  timer: {
    type: Number,
  },
});

// Schema for a quiz
const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
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
  quizCategory: {
    type: String,
    enum: ["Q&A", "Poll"],
    required: true,
  },
  impressions: {
    type: Number,
    default: 0,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
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
