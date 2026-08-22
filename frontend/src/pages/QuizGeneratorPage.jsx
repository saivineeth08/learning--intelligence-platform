import { useEffect, useState } from "react";
import { generateQuiz, getQuiz, listQuizzes } from "../services/ai";
import { getGoals } from "../services/goals";
import { getResources } from "../services/resources";

function QuizGeneratorPage() {
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
  }, []);

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
    e.preventDefault();
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
          "Failed to generate quiz. Ensure the selected resource contains text content."
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Learning Quizzes & Assessments</h1>
        <p className="mt-1 text-slate-600">
          Generate structured assessments from your learning materials and verify your knowledge mastery.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Generator Form & Past Quizzes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Generator Form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Generate New Quiz</h2>
            <form onSubmit={handleGenerateQuiz} className="space-y-3.5">
              <div>
                <label htmlFor="quiz-resource-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Resource
                </label>
                <select
                  id="quiz-resource-select"
                  value={selectedResourceId}
                  onChange={(e) => {
                    setSelectedResourceId(e.target.value);
                    if (e.target.value) setSelectedGoalId("");
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
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
                <label htmlFor="quiz-goal-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Target Learning Goal
                </label>
                <select
                  id="quiz-goal-select"
                  value={selectedGoalId}
                  onChange={(e) => {
                    setSelectedGoalId(e.target.value);
                    if (e.target.value) setSelectedResourceId("");
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
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
                  <label htmlFor="question-count-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Questions
                  </label>
                  <select
                    id="question-count-select"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="3">3 Questions</option>
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="difficulty-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    id="difficulty-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="quiz-custom-title" className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Title (Optional)
                </label>
                <input
                  id="quiz-custom-title"
                  type="text"
                  placeholder="e.g., Quick DSA Quiz"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full rounded-md bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {generating ? "AI Generating Quiz..." : "✨ Generate AI Quiz"}
              </button>
            </form>
          </div>

          {/* Past Quizzes List */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Your Quizzes</h2>
            {loading ? (
              <p className="text-xs text-slate-500">Loading quizzes...</p>
            ) : quizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No quizzes generated yet.</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {quizzes.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuiz(q.id)}
                    className={`w-full text-left rounded-lg p-3 transition-all text-xs cursor-pointer ${
                      activeQuiz?.id === q.id
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-semibold truncate">{q.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] ${activeQuiz?.id === q.id ? "text-slate-300" : "text-slate-500"}`}>
                        {q.question_count || q.questions?.length || 0} Questions
                      </span>
                      {q.resource_title ? (
                        <span className={`text-[10px] truncate ${activeQuiz?.id === q.id ? "text-slate-300" : "text-slate-500"}`}>
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
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-xs">
              <p>Generate a new quiz or select an existing one on the left to start testing.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              {/* Quiz Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{activeQuiz.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeQuiz.questions?.length || 0} Multiple-Choice Questions
                    {activeQuiz.resource_title ? ` • Grounded in ${activeQuiz.resource_title}` : ""}
                  </p>
                </div>
                {submitted && score ? (
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        score.percentage >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : score.percentage >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      Score: {score.correctCount} / {score.total} ({score.percentage}%)
                    </span>
                    <button
                      onClick={handleRetake}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                      className={`rounded-xl p-5 border transition-all ${
                        submitted
                          ? isCorrect
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-rose-200 bg-rose-50/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-bold text-slate-900">
                          {idx + 1}. {q.question}
                        </h3>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
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
                              className={`w-full text-left rounded-lg px-3.5 py-2.5 text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                submitted
                                  ? isOptionCorrect
                                    ? "border-2 border-emerald-500 bg-emerald-100 text-emerald-900 font-bold"
                                    : isOptionWrongSelected
                                    ? "border-2 border-rose-500 bg-rose-100 text-rose-900 font-bold"
                                    : "border border-slate-200 bg-slate-50 text-slate-500"
                                  : isOptionSelected
                                  ? "border-2 border-slate-900 bg-slate-900 text-white font-semibold shadow-xs"
                                  : "border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
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
                        <div className="mt-3.5 pt-3 border-t border-slate-200/80 text-xs text-slate-700 space-y-1">
                          <p className="font-bold text-slate-900">Explanation:</p>
                          <p className="italic text-slate-600">{q.explanation}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Quiz Submit Actions */}
              {!submitted && activeQuiz.questions?.length > 0 ? (
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(userAnswers).length === 0}
                    className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs"
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
