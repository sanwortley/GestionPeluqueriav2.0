import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminSettings() {
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [waLoading, setWaLoading] = useState(false);
    const [waStatus, setWaStatus] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchWhatsAppStatus();
    }, []);

    const fetchWhatsAppStatus = async () => {
        try {
            const res = await api.get('whatsapp/status');
            setWaStatus(res.data);
        } catch (err) {
            console.error("Error fetching WA status", err);
        }
    };

    const handleWhatsAppLogout = async () => {
        if (!window.confirm("¿Estás seguro de que querés desvincular el WhatsApp actual? Esto cerrará la sesión y tendrás que escanear un nuevo QR.")) return;
        
        try {
            setWaLoading(true);
            await api.post('whatsapp/logout');
            setMessage({ type: 'success', text: '✅ WhatsApp desvinculado con éxito. El puente se está reiniciando, por favor espera un momento y recarga la página de QR para vincular el nuevo número.' });
            fetchWhatsAppStatus();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al desvincular WhatsApp' });
        } finally {
            setWaLoading(false);
        }
    };

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
            await api.post('auth/update-password', {
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

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            setLoading(true);
            await api.post('auth/update-email', {
                new_email: newEmail
            });
            setMessage({ type: 'success', text: '✅ Email actualizado correctamente. Deberás usarlo en tu próximo inicio de sesión.' });
            setNewEmail('');
        } catch (err) {
            const detail = err.response?.data?.detail || 'Error al actualizar el email';
            setMessage({ type: 'error', text: detail });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h1 className="title">Configuración</h1>

            {message.text && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                    backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: message.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                    fontSize: '0.9rem'
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Conectividad WhatsApp</h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: waStatus?.isReady ? '#10B981' : '#EF4444',
                        boxShadow: `0 0 10px ${waStatus?.isReady ? '#10B981' : '#EF4444'}`
                    }}></div>
                    <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>
                        {waStatus?.isReady ? 'WhatsApp Conectado' : 'WhatsApp Desconectado / Esperando QR'}
                    </span>
                </div>

                {!waStatus?.isReady && waStatus?.qrUrl && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <a 
                            href={waStatus.qrUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ 
                                width: '100%', 
                                justifyContent: 'center',
                                textTransform: 'uppercase',
                                fontSize: '0.8rem',
                                letterSpacing: '1px',
                                backgroundColor: '#10B981',
                                borderColor: '#10B981'
                            }}
                        >
                            🔗 Vincular con QR
                        </a>
                    </div>
                )}

                {waStatus?.isReady && (
                    <>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Si necesitas cambiar el celular vinculado o si el servicio no responde, podés forzar el cierre de sesión aquí. Luego deberás escanear el código QR nuevamente.
                        </p>

                        <button
                            onClick={handleWhatsAppLogout}
                            className="btn btn-secondary"
                            style={{ 
                                width: '100%', 
                                borderColor: '#EF4444', 
                                color: '#EF4444',
                                justifyContent: 'center',
                                textTransform: 'uppercase',
                                fontSize: '0.8rem',
                                letterSpacing: '1px'
                            }}
                            disabled={waLoading}
                        >
                            {waLoading ? 'Cerrando sesión...' : 'Desvincular WhatsApp Actual'}
                        </button>
                    </>
                )}
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Cambiar Email de Acceso</h2>
                <form onSubmit={handleUpdateEmail}>
                    <div className="form-group">
                        <label className="label">Nuevo Email</label>
                        <input
                            type="email"
                            className="input"
                            required
                            placeholder="ejemplo@correo.com"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}
                        disabled={loading}
                    >
                        {loading ? 'Actualizando...' : 'Actualizar Email'}
                    </button>
                </form>
            </div>

            <div className="card">
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)', fontSize: '1.2rem' }}>Cambiar Contraseña</h2>

                <form onSubmit={handleUpdatePassword}>
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
