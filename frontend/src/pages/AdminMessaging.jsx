import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminMessaging() {
    const [waLoading, setWaLoading] = useState(false);
    const [waStatus, setWaStatus] = useState(null);
    const [pendingNotifs, setPendingNotifs] = useState([]);
    const [recentConfirmed, setRecentConfirmed] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchPendingNotifs = async () => {
        try {
            const res = await api.get('whatsapp/pending-notifs?days=7');
            setPendingNotifs(res.data);
        } catch(e) {
            console.error("Error fetching pending notifs", e);
        }
    };

    const fetchRecentConfirmed = async () => {
        try {
            const res = await api.get('whatsapp/recent-confirmed?days=3');
            setRecentConfirmed(res.data);
        } catch(e) {
            console.error("Error fetching recent confirmed", e);
        }
    };

    const fetchWhatsAppStatus = async () => {
        try {
            const res = await api.get('whatsapp/status');
            setWaStatus(res.data);
        } catch (err) {
            console.error("Error fetching WA status", err);
        }
    };

    useEffect(() => {
        fetchWhatsAppStatus();
        fetchPendingNotifs();
        fetchRecentConfirmed();
        const interval = setInterval(() => {
            fetchWhatsAppStatus();
            fetchPendingNotifs();
            fetchRecentConfirmed();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSendSingle = async (id) => {
        try {
            await api.post(`whatsapp/send-single/${id}`);
            fetchPendingNotifs();
            fetchRecentConfirmed();
        } catch(e) {
            alert("Error al enviar: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleResetAndSend = async (id, clientName) => {
        if (!window.confirm(`¿Reenviar la notificación a ${clientName}? Se enviará un nuevo mensaje aunque ya haya sido enviado antes.`)) return;
        try {
            await api.post(`whatsapp/reset-and-send/${id}`);
            alert(`✅ Mensaje enviado a ${clientName}`);
            fetchPendingNotifs();
            fetchRecentConfirmed();
        } catch(e) {
            alert("Error al reenviar: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleDismiss = async (id) => {
        if (!window.confirm("¿Marcar este turno como notificado sin enviar mensaje?")) return;
        try {
            await api.post(`whatsapp/dismiss/${id}`);
            fetchPendingNotifs();
        } catch(e) {
            alert("Error al descartar notificación.");
        }
    };

    const handleWhatsAppLogout = async () => {
        if (!window.confirm("¿Estás seguro de que querés desvincular el WhatsApp actual? Tendrás que escanear un nuevo QR.")) return;
        try {
            setWaLoading(true);
            await api.post('whatsapp/logout');
            setMessage({ type: 'success', text: '✅ WhatsApp desvinculado. El puente se está reiniciando.' });
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
            alert("Prueba enviada. Revisá el celular del destinatario.");
        } catch(e) {
            alert("Error al enviar prueba: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleRetroactive = async () => {
        if (!window.confirm("¿Reenviar notificaciones a todos los turnos futuros de los últimos 4 días? Puede generar duplicados.")) return;
        try {
            setWaLoading(true);
            const res = await api.post('whatsapp/retroactive-notify');
            alert(`✅ Se enviaron ${res.data.notifications_sent} notificaciones.`);
        } catch(e) {
            alert("Error: " + (e.response?.data?.detail || e.message));
        } finally {
            setWaLoading(false);
        }
    };

    const statusColor = waStatus?.isReady ? '#10B981' : '#EF4444';

    return (
        <div className="animate-fade-in" style={{ maxWidth: '620px', margin: '0 auto' }}>
            <h1 className="title">Mensajería</h1>

            {message.text && (
                <div style={{
                    padding: '1rem', borderRadius: '8px', marginBottom: '2rem',
                    backgroundColor: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: message.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                    fontSize: '0.9rem'
                }}>
                    {message.text}
                </div>
            )}

            {/* Estado de conexión */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ marginBottom: '1.2rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Conectividad WhatsApp</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusColor, boxShadow: `0 0 10px ${statusColor}` }}></div>
                    <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 500 }}>
                        {waStatus?.isReady ? 'WhatsApp Conectado' : 'WhatsApp Desconectado / Esperando QR'}
                    </span>
                </div>

                {waStatus?.isReady && waStatus?.sessionInfo && (
                    <div style={{ marginBottom: '1rem', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem', color: '#9CA3AF' }}>
                        <div style={{ marginBottom: '4px' }}>📱 <strong>Sesión:</strong> {waStatus.sessionInfo.pushname} ({waStatus.sessionInfo.wid})</div>
                        <div>💻 <strong>Plataforma:</strong> {waStatus.sessionInfo.platform}</div>
                    </div>
                )}

                {waStatus?.isReady && (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Cola de Mensajes</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: waStatus.queueLength > 0 ? '#F59E0B' : '#6B7280', color: '#fff' }}>
                                {waStatus.queueLength} pendientes
                            </span>
                        </div>
                        {waStatus.pendingMessages?.length > 0 ? (
                            <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '5px' }}>
                                {waStatus.pendingMessages.map((msg, idx) => (
                                    <div key={idx} style={{ padding: '5px', borderBottom: idx < waStatus.pendingMessages.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>📞 {msg.to}</span>
                                        <span style={{ opacity: 0.6 }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', margin: 0 }}>Sin mensajes en espera.</p>
                        )}
                    </div>
                )}

                {!waStatus?.isReady && waStatus?.qrUrl && (
                    <a href={waStatus.qrUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', backgroundColor: '#10B981', borderColor: '#10B981', marginBottom: '1rem' }}>
                        🔗 Vincular con QR
                    </a>
                )}

                {waStatus?.isReady && (
                    <button onClick={handleWhatsAppLogout} className="btn btn-secondary"
                        style={{ width: '100%', borderColor: '#EF4444', color: '#EF4444', justifyContent: 'center', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}
                        disabled={waLoading}>
                        {waLoading ? 'Cerrando sesión...' : 'Desvincular WhatsApp Actual'}
                    </button>
                )}
            </div>

            {/* Herramientas de Diagnóstico */}
            {waStatus?.isReady && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Herramientas de Diagnóstico</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <button onClick={handleTestSend} className="btn btn-secondary" style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '0.6rem' }}>
                            🚀 Enviar Mensaje de Prueba
                        </button>
                        <button onClick={handleRetroactive} className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '0.6rem', color: '#FBBF24', borderColor: '#FBBF24' }}
                            disabled={waLoading}>
                            🔔 Reenviar Todos los Colgados
                        </button>
                    </div>
                </div>
            )}

            {/* Notificaciones Pendientes */}
            {waStatus?.isReady && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1rem', color: '#FBBF24', fontSize: '1.1rem' }}>
                        Notificaciones de Registro/Confirmación Pendientes
                    </h2>
                    {pendingNotifs.length > 0 ? (
                        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem' }}>
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
                                                    fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                                                    background: notif.status === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)',
                                                    color: notif.status === 'CONFIRMED' ? '#10B981' : '#EAB308'
                                                }}>
                                                    {notif.status === 'CONFIRMED' ? 'CONFIRMADO' : 'PENDIENTE'}
                                                </span>
                                                {notif.notification_error && (
                                                    <div style={{ marginTop: '4px', color: '#EF4444', fontSize: '0.6rem' }}>
                                                        ⚠️ {notif.notification_error}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button title="Enviar ahora" onClick={() => handleSendSingle(notif.id)}
                                                        style={{ background: '#10B981', border: 'none', borderRadius: '4px', padding: '4px 8px', color: 'white', cursor: 'pointer' }}>
                                                        🚀
                                                    </button>
                                                    <button title="Ignorar" onClick={() => handleDismiss(notif.id)}
                                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', color: 'white', cursor: 'pointer' }}>
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
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic' }}>
                            ✅ No hay notificaciones pendientes de envío. Todos los clientes recibieron su mensaje inicial.
                        </p>
                    )}
                </div>
            )}

            {/* Turnos Recientes — Pendientes y Confirmados */}
            {waStatus?.isReady && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ marginBottom: '0.5rem', color: '#60A5FA', fontSize: '1.1rem' }}>
                        🔁 Turnos Recientes — Reenvío Manual
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: '1rem' }}>
                        Todos los turnos (PENDIENTES y CONFIRMADOS) de los últimos 3 días. Usá 🔁 para reenviar a cualquier cliente.
                    </p>
                    {recentConfirmed.length > 0 ? (
                        <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.5rem' }}>
                            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '0.5rem' }}>Cliente</th>
                                        <th style={{ padding: '0.5rem' }}>Fecha</th>
                                        <th style={{ padding: '0.5rem' }}>Estado Turno</th>
                                        <th style={{ padding: '0.5rem' }}>Envío WA</th>
                                        <th style={{ padding: '0.5rem' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentConfirmed.map(notif => (
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
                                                    fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                                                    background: notif.status === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)',
                                                    color: notif.status === 'CONFIRMED' ? '#10B981' : '#EAB308'
                                                }}>
                                                    {notif.status === 'CONFIRMED' ? 'CONFIRMADO' : 'PENDIENTE'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                {notif.notified_at ? (
                                                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>✅ Enviado</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>❌ Sin enviar</span>
                                                )}
                                                {notif.notification_error && (
                                                    <div style={{ marginTop: '3px', color: '#EF4444', fontSize: '0.6rem' }}>⚠️ {notif.notification_error}</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <button
                                                    title="Forzar reenvío"
                                                    onClick={() => handleResetAndSend(notif.id, notif.client_name)}
                                                    style={{ background: '#3B82F6', border: 'none', borderRadius: '4px', padding: '4px 10px', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                    🔁 Reenviar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic' }}>
                            Sin turnos en los últimos 3 días.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
