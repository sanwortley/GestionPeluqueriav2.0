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
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [waLoading, setWaLoading] = useState(false);
    const [waStatus, setWaStatus] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [pendingNotifs, setPendingNotifs] = useState([]);

    const fetchPendingNotifs = async () => {
        try {
            const res = await api.get('whatsapp/pending-notifs?days=7');
            setPendingNotifs(res.data);
        } catch(e) {
            console.error("Error fetching pending notifs", e);
        }
    };

    useEffect(() => {
        fetchWhatsAppStatus();
        fetchPendingNotifs();
        const interval = setInterval(() => {
            fetchWhatsAppStatus();
            fetchPendingNotifs();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSendSingle = async (id) => {
        try {
            await api.post(`whatsapp/send-single/${id}`);
            fetchPendingNotifs();
        } catch(e) {
            alert("Error al enviar notificación individual.");
        }
    };

    const handleDismiss = async (id) => {
        if (!window.confirm("¿Seguro que querés marcar este turno como notificado sin enviar mensaje?")) return;
        try {
            await api.post(`whatsapp/dismiss/${id}`);
            fetchPendingNotifs();
        } catch(e) {
            alert("Error al descartar notificación.");
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

    const handleTestSend = async () => {
        const phone = window.prompt("Ingresá un número de teléfono (con código de país, ej: 549...)");
        if (!phone) return;
        const msg = window.prompt("Mensaje de prueba", "Este es un mensaje de prueba desde el panel.");
        if (!msg) return;
        try {
            await api.post('whatsapp/test-send?phone=' + encodeURIComponent(phone) + '&message=' + encodeURIComponent(msg));
            alert("Prueba enviada en segundo plano. Revisá los logs de Railway o el celular del destinatario.");
        } catch(e) {
            alert("Error al enviar prueba: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleRetroactive = async () => {
        if (!window.confirm("¿Estás seguro de que querés reenviar las notificaciones de creación (bienvenida) a todos los turnos futuros de los últimos 4 días? Esto podría causar mensajes duplicados en algunos clientes.")) return;
        try {
            setWaLoading(true);
            const res = await api.post('whatsapp/retroactive-notify');
            alert(`✅ Proceso completado con éxito.\nSe enviaron ${res.data.notifications_sent} notificaciones.`);
        } catch(e) {
            alert("Error al ejecutar proceso retroactivo: " + (e.response?.data?.detail || e.message));
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

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--primary)' }}>Herramientas de Diagnóstico</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                <button
                                    onClick={handleTestSend}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.6rem' }}
                                >
                                    🚀 Enviar Mensaje de Prueba
                                </button>
                                <button
                                    onClick={handleRetroactive}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', justifyContent: 'center', padding: '0.6rem', color: '#FBBF24', borderColor: '#FBBF24' }}
                                    disabled={waLoading}
                                >
                                    🔔 Reenviar Todos los Colgados
                                </button>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#FBBF24' }}>
                                Notificaciones de Registro/Confirmación Pendientes
                            </h4>
                            
                            {pendingNotifs.length > 0 ? (
                                <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem', marginTop: '1rem' }}>
                                    <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ padding: '0.5rem' }}>Cliente</th>
                                                <th style={{ padding: '0.5rem' }}>Fecha</th>
                                                <th style={{ padding: '0.5rem' }}>Estado</th>
                                                <th style={{ padding: '0.5rem' }}>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingNotifs.map(notif => (
                                                <tr key={notif.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <div style={{ fontWeight: 'bold' }}>{notif.client_name}</div>
                                                        <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{notif.client_phone}</div>
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {new Date(notif.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                                        <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{notif.start_time} hs</div>
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <span style={{ 
                                                            fontSize: '0.6rem', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            background: notif.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                                            color: notif.status === 'CONFIRMED' ? '#10B981' : '#EAB308'
                                                        }}>
                                                            {notif.status === 'CONFIRMED' ? 'CONFIRMADO' : 'PENDIENTE'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button 
                                                                title="Enviar ahora"
                                                                onClick={() => handleSendSingle(notif.id)}
                                                                style={{ background: '#10B981', border: 'none', borderRadius: '4px', padding: '4px 8px', color: 'white', cursor: 'pointer' }}
                                                            >
                                                                🚀
                                                            </button>
                                                            <button 
                                                                title="Ignorar"
                                                                onClick={() => handleDismiss(notif.id)}
                                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', color: 'white', cursor: 'pointer' }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', marginTop: '1rem' }}>
                                    ✅ No hay notificaciones pendientes de envío. Todos los clientes recibieron su mensaje inicial.
                                </p>
                            )}
                        </div>
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
