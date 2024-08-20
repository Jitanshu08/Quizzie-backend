const express = require("express");
const mongoose = require("mongoose");
const Quiz = require("../models/quiz");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// Route to create a new quiz
router.post("/create", authMiddleware, async (req, res) => {
  const { title, questions, quizStructure, quizCategory } = req.body;

  // Validate input
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!questions || questions.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one question is required" });
  }
  if (!quizStructure) {
    return res.status(400).json({ message: "Quiz structure is required" });
  }
  if (!quizCategory) {
    return res.status(400).json({ message: "Quiz category is required" });
  }

  // Validate quizStructure
  const validQuizStructures = ["Single Question", "Multiple Questions"];
  if (!validQuizStructures.includes(quizStructure)) {
    return res.status(400).json({
      message: `Invalid quiz structure. Must be one of: ${validQuizStructures.join(
        ", "
      )}`,
    });
  }

  // Validate quizCategory
  const validQuizCategories = ["Q&A", "Poll"];
  if (!validQuizCategories.includes(quizCategory)) {
    return res.status(400).json({
      message: `Invalid quiz category. Must be one of: ${validQuizCategories.join(
        ", "
      )}`,
    });
  }

  try {
    const newQuiz = new Quiz({
      title,
      creator: req.user.id,
      questions,
      quizStructure,
      quizCategory,
    });

    const savedQuiz = await newQuiz.save();
    res.status(201).json(savedQuiz);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;

// Route to get all quizzes created by the logged-in user
router.get("/my-quizzes", authMiddleware, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user.id });
    res.status(200).json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to get a single quiz by ID
router.get("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Increment impressions count
    quiz.impressions += 1;
    await quiz.save();

    res.status(200).json(quiz);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to share a quiz (generate a link)
router.get("/share/:id", authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if the logged-in user is the creator
    if (quiz.creator.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to share this quiz" });
    }

    const shareableLink = `${req.protocol}://${req.get("host")}/quiz/${
      quiz._id
    }`;
    res.status(200).json({ link: shareableLink });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
