import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { generateQuiz, getQuiz, listQuizzes } from "../services/ai";
import { getGoals } from "../services/goals";
import { getResources } from "../services/resources";

function QuizGeneratorPage() {
  const [searchParams] = useSearchParams();
  const resourceParam = searchParams.get("resource");
  const goalParam = searchParams.get("goal");

  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [resources, setResources] = useState([]);
  const [goals, setGoals] = useState([]);

  // Generator form state
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [generating, setGenerating] = useState(false);

  // Quiz Taking state
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInitialData() {
    setError("");
    try {
      const [quizzesData, resourcesData, goalsData] = await Promise.all([
        listQuizzes(),
        getResources(),
        getGoals(),
      ]);
      setQuizzes(quizzesData);
      setResources(resourcesData);
      setGoals(goalsData);

      // Handle query params ?resource=<id> or ?goal=<id>
      if (resourceParam) {
        setSelectedResourceId(String(resourceParam));
      } else if (goalParam) {
        setSelectedGoalId(String(goalParam));
      }

      if (quizzesData.length > 0) {
        const fullQuiz = await getQuiz(quizzesData[0].id);
        setActiveQuiz(fullQuiz);
      }
    } catch (err) {
      setError("Failed to load quizzes or resources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [resourceParam, goalParam]);

  async function handleSelectQuiz(quizId) {
    setError("");
    try {
      const fullQuiz = await getQuiz(quizId);
      setActiveQuiz(fullQuiz);
      setUserAnswers({});
      setSubmitted(false);
      setScore(null);
    } catch (err) {
      setError("Failed to load quiz details.");
    }
  }

  async function handleGenerateQuiz(e) {
    if (e) e.preventDefault();
    if (!selectedResourceId && !selectedGoalId) {
      setError("Please select either a learning resource or a goal to generate questions from.");
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const payload = {
        resource_id: selectedResourceId ? parseInt(selectedResourceId, 10) : null,
        goal_id: selectedGoalId ? parseInt(selectedGoalId, 10) : null,
        title: quizTitle.trim() || undefined,
        question_count: parseInt(questionCount, 10),
        difficulty,
      };

      const newQuiz = await generateQuiz(payload);
      setQuizzes([newQuiz, ...quizzes]);
      setActiveQuiz(newQuiz);
      setUserAnswers({});
      setSubmitted(false);
      setScore(null);
      setQuizTitle("");
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.question_count ||
          "Failed to generate quiz. Ensure the selected material contains readable content."
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleOptionSelect(questionId, optionText) {
    if (submitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionText,
    }));
  }

  function handleSubmitQuiz() {
    if (!activeQuiz?.questions) return;
    let correctCount = 0;
    activeQuiz.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correct_answer) {
        correctCount += 1;
      }
    });

    const total = activeQuiz.questions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    setScore({ correctCount, total, percentage });
    setSubmitted(true);
  }

  function handleRetake() {
    setUserAnswers({});
    setSubmitted(false);
    setScore(null);
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Learning Quizzes & Assessments</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Generate structured assessments from your learning materials and verify your knowledge mastery.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex justify-between items-center shadow-xs">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-xs font-bold text-red-800 dark:text-red-300 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generator Form & Past Quizzes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Generator Form */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Generate New Quiz</h2>
            <form onSubmit={handleGenerateQuiz} className="space-y-3.5">
              <div>
                <label htmlFor="quiz-resource-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Resource
                </label>
                <select
                  id="quiz-resource-select"
                  value={selectedResourceId}
                  onChange={(e) => {
                    setSelectedResourceId(e.target.value);
                    if (e.target.value) setSelectedGoalId("");
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select a Resource...</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quiz-goal-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Or Target Learning Goal
                </label>
                <select
                  id="quiz-goal-select"
                  value={selectedGoalId}
                  onChange={(e) => {
                    setSelectedGoalId(e.target.value);
                    if (e.target.value) setSelectedResourceId("");
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select a Goal...</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="question-count-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Questions
                  </label>
                  <select
                    id="question-count-select"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="3">3 Questions</option>
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="difficulty-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    id="difficulty-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="quiz-custom-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Title (Optional)
                </label>
                <input
                  id="quiz-custom-title"
                  type="text"
                  placeholder="e.g., Quick DSA Assessment"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full rounded-lg bg-blue-600 dark:bg-blue-500 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                {generating ? "AI Generating Quiz..." : "✨ Generate AI Quiz"}
              </button>
            </form>
          </div>

          {/* Past Quizzes List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your Quizzes</h2>
            {loading ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading quizzes...</p>
            ) : quizzes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No quizzes generated yet.</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {quizzes.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuiz(q.id)}
                    className={`w-full text-left rounded-xl p-3 transition-all text-xs cursor-pointer ${
                      activeQuiz?.id === q.id
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <p className="font-semibold truncate">{q.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] ${activeQuiz?.id === q.id ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                        {q.question_count || q.questions?.length || 0} Questions
                      </span>
                      {q.resource_title ? (
                        <span className={`text-[10px] truncate ${activeQuiz?.id === q.id ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                          • Doc: {q.resource_title}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quiz Taking View */}
        <div className="lg:col-span-2">
          {!activeQuiz ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400 dark:text-slate-500 shadow-xs">
              <p>Generate a new quiz or select an existing one on the left to start testing.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
              {/* Quiz Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{activeQuiz.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeQuiz.questions?.length || 0} Multiple-Choice Questions
                    {activeQuiz.resource_title ? ` • Grounded in ${activeQuiz.resource_title}` : ""}
                  </p>
                </div>
                {submitted && score ? (
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        score.percentage >= 80
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                          : score.percentage >= 50
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                          : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                      }`}
                    >
                      Score: {score.correctCount} / {score.total} ({score.percentage}%)
                    </span>
                    <button
                      onClick={handleRetake}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      Retake
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {activeQuiz.questions?.map((q, idx) => {
                  const selected = userAnswers[q.id];
                  const isCorrect = submitted && selected === q.correct_answer;
                  const isIncorrect = submitted && selected && selected !== q.correct_answer;

                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl p-5 border transition-all ${
                        submitted
                          ? isCorrect
                            ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                            : "border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {idx + 1}. {q.question}
                        </h3>
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {q.difficulty}
                        </span>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        {q.options?.map((opt, oIdx) => {
                          const isOptionSelected = selected === opt;
                          const isOptionCorrect = submitted && opt === q.correct_answer;
                          const isOptionWrongSelected = submitted && isOptionSelected && opt !== q.correct_answer;

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleOptionSelect(q.id, opt)}
                              disabled={submitted}
                              className={`w-full text-left rounded-xl px-4 py-3 text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                submitted
                                  ? isOptionCorrect
                                    ? "border-2 border-emerald-500 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold"
                                    : isOptionWrongSelected
                                    ? "border-2 border-rose-500 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 font-bold"
                                    : "border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-500"
                                  : isOptionSelected
                                  ? "border-2 border-blue-600 bg-blue-600 text-white font-semibold shadow-xs"
                                  : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                            >
                              <span>{opt}</span>
                              {submitted && isOptionCorrect ? <span>✓ Correct</span> : null}
                              {submitted && isOptionWrongSelected ? <span>✗ Your Answer</span> : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Reveal */}
                      {submitted ? (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          <p className="font-bold text-slate-900 dark:text-white">Explanation:</p>
                          <p className="italic text-slate-600 dark:text-slate-400">{q.explanation}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Quiz Submit Actions */}
              {!submitted && activeQuiz.questions?.length > 0 ? (
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(userAnswers).length === 0}
                    className="rounded-xl bg-blue-600 dark:bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                  >
                    Submit Answers ({Object.keys(userAnswers).length} / {activeQuiz.questions.length} answered)
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default QuizGeneratorPage;
