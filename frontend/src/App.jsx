import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ClientBooking from './pages/ClientBooking';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminServices from './pages/AdminServices';
import AdminBlocks from './pages/AdminBlocks';
import AdminHistory from './pages/AdminHistory';
import AdminClients from './pages/AdminClients';
import AdminSettings from './pages/AdminSettings';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/reservar" replace />} />
          <Route path="/reservar" element={<ClientBooking />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/blocks" element={<AdminBlocks />} />
            <Route path="/admin/history" element={<AdminHistory />} />
            <Route path="/admin/clients" element={<AdminClients />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
