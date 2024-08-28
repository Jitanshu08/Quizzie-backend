const express = require("express");
const mongoose = require("mongoose");
const Quiz = require("../models/quiz");
const Response = require("../models/response");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// Route to get dashboard data
router.get("/dashboard-data", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch the total number of quizzes created by the logged-in user
    const totalQuizzes = await Quiz.countDocuments({ creator: userId });

    // Fetch the total number of questions created by the logged-in user
    const userQuizzes = await Quiz.find({ creator: userId });
    const totalQuestions = userQuizzes.reduce(
      (acc, quiz) => acc + quiz.questions.length,
      0
    );

    // Fetch the total number of impressions on the user's quizzes
    const totalImpressions = userQuizzes.reduce(
      (acc, quiz) => acc + quiz.impressions,
      0
    );

    // Fetch the trending quizzes (impressions > 10)
    const trendingQuizzes = await Quiz.find({
      isTrending: true,
      creator: userId,
    });

    // Return the data
    res.status(200).json({
      totalQuizzes,
      totalQuestions,
      totalImpressions,
      trendingQuizzes,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

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

// Route to get all quizzes created by the logged-in user
router.get("/my-quizzes", authMiddleware, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user.id });
    res.status(200).json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to get a single quiz by ID (For Taking Quiz)
router.get("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json(quiz);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to update an existing quiz
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const quizId = req.params.id;
    const updatedData = req.body;

    // Find and update the quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(quizId, updatedData, {
      new: true,
    });

    if (!updatedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json(updatedQuiz);
  } catch (err) {
    console.error("Error updating quiz:", err);
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

// Route to delete a quiz by ID
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Check if the logged-in user is the creator of the quiz
    if (quiz.creator.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this quiz" });
    }

    await Quiz.findByIdAndDelete(id);
    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to save a user's response to a quiz
router.post("/response/:quizId", async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;

    const response = new Response({
      quiz: quizId,
      answers: answers.map((answer) => ({
        question: answer.question,
        selectedOption: answer.selectedOption,
      })),
    });

    if (req.user && req.user.id) {
      response.user = req.user.id;
    }

    const savedResponse = await response.save();

    // Increment impressions only when a response is submitted
    const quiz = await Quiz.findById(quizId);
    if (quiz) {
      quiz.impressions += 1;
      await quiz.save();
    }

    res.status(201).json(savedResponse);
  } catch (err) {
    console.error("Error submitting response:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to get question-wise analysis for a quiz (DO NOT Increment Impressions)
router.get("/analysis/:quizId", authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let analysisData = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      let question = quiz.questions[i];
      let analysis = {
        question: question.text,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        options: [],
      };

      // Fetch all responses for this question
      let responses = await Response.find({
        quiz: quizId,
        "answers.question": question._id,
      });

      analysis.attempted = responses.length;

      if (quiz.quizCategory === "Q&A") {
        // For Q&A type quizzes
        responses.forEach((response) => {
          const answer = response.answers.find(
            (a) => a.question.toString() === question._id.toString()
          );
          if (answer) {
            if (answer.selectedOption === question.correctOption) {
              analysis.correct++;
            } else {
              analysis.incorrect++;
            }
          }
        });
      } else if (quiz.quizCategory === "Poll") {
        // For Poll type quizzes
        question.options.forEach((option, index) => {
          let count = responses.filter((response) => {
            const answer = response.answers.find(
              (a) => a.question.toString() === question._id.toString()
            );
            return answer && answer.selectedOption === index;
          }).length;
          analysis.options.push({ option, count });
        });
      }

      analysisData.push(analysis);
    }

    res.status(200).json(analysisData);
  } catch (err) {
    console.error("Error fetching analysis data:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
