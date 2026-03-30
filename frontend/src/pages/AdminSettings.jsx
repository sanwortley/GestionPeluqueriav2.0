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
        const interval = setInterval(fetchWhatsAppStatus, 10000); // Polling cada 10s
        return () => clearInterval(interval);
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

                {waStatus?.isReady && waStatus?.sessionInfo && (
                    <>
                        <div style={{ 
                            marginBottom: '1rem', 
                            padding: '10px', 
                            backgroundColor: 'rgba(255,255,255,0.05)', 
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#9CA3AF'
                        }}>
                            <div style={{ marginBottom: '4px' }}>📱 <strong>Sesión:</strong> {waStatus.sessionInfo.pushname} ({waStatus.sessionInfo.wid})</div>
                            <div>💻 <strong>Plataforma:</strong> {waStatus.sessionInfo.platform}</div>
                        </div>

                        {/* Nueva sección de cola */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)' }}>Cola de Mensajes</h4>
                                <span style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 8px', 
                                    borderRadius: '10px', 
                                    backgroundColor: waStatus.queueLength > 0 ? '#F59E0B' : '#6B7280',
                                    color: '#fff'
                                }}>
                                    {waStatus.queueLength} pendientes
                                </span>
                            </div>
                            
                            {waStatus.pendingMessages && waStatus.pendingMessages.length > 0 ? (
                                <div style={{ 
                                    maxHeight: '150px', 
                                    overflowY: 'auto', 
                                    fontSize: '0.75rem', 
                                    backgroundColor: 'rgba(0,0,0,0.2)', 
                                    borderRadius: '6px',
                                    padding: '5px'
                                }}>
                                    {waStatus.pendingMessages.map((msg, idx) => (
                                        <div key={idx} style={{ 
                                            padding: '6px', 
                                            borderBottom: idx < waStatus.pendingMessages.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span>📞 {msg.to}</span>
                                            <span style={{ opacity: 0.6 }}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', margin: 0 }}>
                                    Sin mensajes en espera.
                                </p>
                            )}
                        </div>
                    </>
                )}

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

                {!waStatus?.isReady && (
                    <p style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center', marginBottom: '1.5rem' }}>
                        ¿Problemas vinculando? <button 
                            onClick={handleWhatsAppLogout} 
                            style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                            Hacé clic acá para reiniciar el proceso de cero.
                        </button>
                    </p>
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
