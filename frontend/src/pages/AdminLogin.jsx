import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const res = await api.post('/auth/login', formData);
            localStorage.setItem('token', res.data.access_token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError('Credenciales inválidas');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '0 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <img src="/images/logo.jpg" alt="Roma Cabello" style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '50%', border: '4px solid var(--primary)', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(255,255,255,0.2)' }} />
                <h1 className="title" style={{ fontFamily: "'Staatliches', cursive", fontSize: '2.5rem', letterSpacing: '4px' }}>ADMINISTRACIÓN</h1>
            </div>
            {error && <p style={{ color: 'var(--danger)', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
            <form onSubmit={handleLogin} className="card">
                <div className="form-group">
                    <label className="label">Email</label>
                    <input
                        type="email"
                        className="input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="label">Password</label>
                    <input
                        type="password"
                        className="input"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>Ingresar</button>
            </form>
        </div>
    );
}
