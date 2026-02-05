import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin/login');
    };

    const isClient = location.pathname.startsWith('/reservar');
    const isAdmin = location.pathname.startsWith('/admin');
    // Simple check

    return (
        <div className="app-container">
            <nav className="navbar">
                <Link to="/" className="navbar-brand-container">
                    <span className="navbar-brand">ROMA CABELLO</span>
                </Link>
                <div className="nav-links">
                    {token && (
                        <>
                            <Link to="/admin/dashboard" className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>Turnos</Link>
                            <Link to="/admin/services" className={`nav-link ${location.pathname === '/admin/services' ? 'active' : ''}`}>Servicios</Link>
                            <Link to="/admin/blocks" className={`nav-link ${location.pathname === '/admin/blocks' ? 'active' : ''}`}>Bloqueos</Link>
                            <Link to="/admin/history" className={`nav-link ${location.pathname === '/admin/history' ? 'active' : ''}`}>Historial</Link>
                            <Link to="/admin/clients" className={`nav-link ${location.pathname === '/admin/clients' ? 'active' : ''}`}>Clientes</Link>
                            <button onClick={handleLogout} className="btn btn-secondary btn-logout">
                                <span className="logout-text">Cerrar Sesión</span>
                            </button>
                        </>
                    )}
                </div>
            </nav>
            <main className="main-content">
                {children}
            </main>
            <footer className="footer">
                <div className="footer-content">
                    <p className="footer-title">Roma Cabello</p>
                    <div className="social-links">
                        <a href="https://www.instagram.com/roma.cabello" target="_blank" rel="noopener noreferrer" className="social-icon instagram" title="Instagram">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="https://wa.me/5493515427973" target="_blank" rel="noopener noreferrer" className="social-icon whatsapp" title="WhatsApp">
                            <i className="fab fa-whatsapp"></i>
                        </a>
                    </div>
                    {!token && location.pathname === '/reservar' && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <Link to="/admin/login" className="admin-footer-link">Acceso Administrativo</Link>
                        </div>
                    )}
                    <p className="footer-copy">© {new Date().getFullYear()} - Roma Cabello</p>
                </div>
            </footer>
        </div>
    );
}
