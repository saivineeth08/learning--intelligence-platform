import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AnalyticsPage from "../pages/AnalyticsPage";
import DashboardPage from "../pages/DashboardPage";
import GoalDetailPage from "../pages/GoalDetailPage";
import GoalsPage from "../pages/GoalsPage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import NotesPage from "../pages/NotesPage";
import ProfilePage from "../pages/ProfilePage";
import RecommendationsPage from "../pages/RecommendationsPage";
import RegisterPage from "../pages/RegisterPage";
import DocumentChatPage from "../pages/DocumentChatPage";
import QuizGeneratorPage from "../pages/QuizGeneratorPage";
import ResourcesPage from "../pages/ResourcesPage";
import SettingsPage from "../pages/SettingsPage";
import StudySessionsPage from "../pages/StudySessionsPage";
import TasksPage from "../pages/TasksPage";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "analytics",
            element: <AnalyticsPage />,
          },
          {
            path: "goals",
            element: <GoalsPage />,
          },
          {
            path: "goals/:id",
            element: <GoalDetailPage />,
          },
          {
            path: "tasks",
            element: <TasksPage />,
          },
          {
            path: "study-sessions",
            element: <StudySessionsPage />,
          },
          {
            path: "resources",
            element: <ResourcesPage />,
          },
          {
            path: "notes",
            element: <NotesPage />,
          },
          {
            path: "ai/chat",
            element: <DocumentChatPage />,
          },
          {
            path: "ai/quizzes",
            element: <QuizGeneratorPage />,
          },
          {
            path: "ai/recommendations",
            element: <RecommendationsPage />,
          },
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
]);
