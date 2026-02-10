import { useState } from 'react';
import api from '../api';

export default function AdminSettings() {
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwords.new_password !== passwords.confirm_password) {
            setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
            return;
        }

        if (passwords.new_password.length < 6) {
            setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/update-password', {
                current_password: passwords.current_password,
                new_password: passwords.new_password
            });
            setMessage({ type: 'success', text: '✅ Contraseña actualizada correctamente' });
            setPasswords({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            const detail = err.response?.data?.detail || 'Error al actualizar la contraseña';
            setMessage({ type: 'error', text: detail });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h1 className="title">Configuración</h1>

            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Cambiar Contraseña</h2>

                <form onSubmit={handleUpdatePassword}>
                    {message.text && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: message.type === 'success' ? '#10B981' : '#EF4444',
                            border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                            fontSize: '0.9rem'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="label">Contraseña Actual</label>
                        <input
                            type="password"
                            className="input"
                            required
                            value={passwords.current_password}
                            onChange={e => setPasswords({ ...passwords, current_password: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Nueva Contraseña</label>
                        <input
                            type="password"
                            className="input"
                            required
                            value={passwords.new_password}
                            onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Confirmar Nueva Contraseña</label>
                        <input
                            type="password"
                            className="input"
                            required
                            value={passwords.confirm_password}
                            onChange={e => setPasswords({ ...passwords, confirm_password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Información de la Cuenta</h2>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                    Esta contraseña es para el acceso administrativo al panel. Recuerda usar una contraseña segura que no compartas con nadie.
                </p>
            </div>
        </div>
    );
}
