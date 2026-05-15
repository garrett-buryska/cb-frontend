// src/App.jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/Routes';

// Pages
import Auth from './pages/Auth';
import List from './pages/List';
import Board from './pages/Board';

const router = createBrowserRouter([
  // 1. PUBLIC ONLY ROUTES (Login / Register)
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/auth', element: <Auth /> },
    ],
  },

  // 2. PROTECTED ROUTES (Requires Session)
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/list', element: <List /> },
      { path: '/boards/:boardId', element: <Board /> },
      // Add other private routes here
    ],
  },

  // 3. MIXED ROUTES (Public or Private depending on server)
  {
    path: '/public/boards/:boardID', element: <div>Board Page</div>,
  },

  // 4. 404 Catch-all
  {
    path: '*',
    element: <div>404 Not Found</div> // TODO: REDIRECT PAGE
  }
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}