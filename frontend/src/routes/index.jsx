import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import GoalDetailPage from "../pages/GoalDetailPage";
import GoalsPage from "../pages/GoalsPage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";
import RegisterPage from "../pages/RegisterPage";
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
            path: "profile",
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
]);
