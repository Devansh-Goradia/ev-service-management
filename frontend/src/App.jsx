import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Welcome from './pages/Welcome.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Garage from './pages/Garage.jsx';
import BookService from './pages/BookService.jsx';
import Services from './pages/Services.jsx';
import Account from './pages/Account.jsx';
import IndianEVs from './pages/IndianEVs.jsx';

/**
 * ProtectedRoute — renders children only if a valid token exists in localStorage.
 * Otherwise redirects the user to /login.
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('ev_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/indian-evs" element={<IndianEVs />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/garage"
          element={
            <ProtectedRoute>
              <Garage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-service"
          element={
            <ProtectedRoute>
              <BookService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
