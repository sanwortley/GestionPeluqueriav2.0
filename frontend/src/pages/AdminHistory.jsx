import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../api';

export default function AdminHistory() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/appointments');
            // Sort by date desc (Most recent first)
            const sorted = res.data.sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.start_time);
                const dateB = new Date(b.date + 'T' + b.start_time);
                return dateB - dateA;
            });
            setAppointments(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const togglePaid = async (id, currentPaid) => {
        try {
            await api.patch(`/appointments/${id}`, { is_paid: !currentPaid });
            // Update local state
            setAppointments(appointments.map(a =>
                a.id === id ? { ...a, is_paid: !currentPaid } : a
            ));
        } catch (err) {
            alert('Error al actualizar estado de pago');
            console.error(err);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            if (!confirm(`¿Seguro que deseas cambiar el estado a ${newStatus === 'CANCELLED' ? 'CANCELADO' : 'CONFIRMADO'}?`)) return;

            await api.patch(`/appointments/${id}`, { status: newStatus });
            // Update local state
            setAppointments(appointments.map(a =>
                a.id === id ? { ...a, status: newStatus } : a
            ));
        } catch (err) {
            alert('Error al actualizar estado del turno');
            console.error(err);
        }
    };

    const filteredAppointments = appointments.filter(a => {
        const lowerQ = query.toLowerCase();
        return (
            a.client_name.toLowerCase().includes(lowerQ) ||
            a.client_phone.includes(query) ||
            (a.service?.name || '').toLowerCase().includes(lowerQ) ||
            a.date.includes(query)
        );
    });

    return (
        <div className="animate-fade-in">
            <h1 className="title">Historial de Turnos</h1>

            <div className="card">
                <div style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono, servicio o fecha..."
                        className="input"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>

                {loading ? (
                    <p>Cargando historial...</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem 0.5rem' }}>Fecha</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Hora</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Cliente</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Teléfono</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Servicio</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Estado</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Cobrado</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Nota</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAppointments.map((appt, index) => {
                                    const prevAppt = filteredAppointments[index - 1];
                                    const isNewDay = !prevAppt || prevAppt.date !== appt.date;

                                    return (
                                        <tr key={appt.id} className={isNewDay ? 'new-day-row' : ''} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '0.5rem', fontWeight: isNewDay ? 'bold' : 'normal', color: isNewDay ? 'var(--primary)' : 'inherit' }}>
                                                {format(new Date(appt.date + 'T12:00:00'), 'dd/MM/yyyy')}
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>{appt.start_time}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{appt.client_name}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>{appt.client_phone}</td>
                                            <td style={{ padding: '0.5rem' }}>{appt.service?.name || '-'}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <select
                                                    value={appt.status}
                                                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                                                    style={{
                                                        padding: '0.4rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        backgroundColor: appt.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' :
                                                            appt.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.2)' :
                                                                appt.status === 'FINISHED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                        color: appt.status === 'CONFIRMED' ? '#10B981' :
                                                            appt.status === 'CANCELLED' ? '#EF4444' :
                                                                appt.status === 'FINISHED' ? '#3B82F6' : '#eee',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer',
                                                        width: '120px'
                                                    }}
                                                >
                                                    <option value="CONFIRMED">Confirmado</option>
                                                    <option value="FINISHED">Finalizado</option>
                                                    <option value="CANCELLED">Cancelado</option>
                                                    <option value="NO_SHOW">No vino</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => togglePaid(appt.id, appt.is_paid)}
                                                    style={{
                                                        background: appt.is_paid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        border: `1px solid ${appt.is_paid ? '#10B981' : '#EF4444'}`,
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        padding: '0.3rem 0.8rem',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.75rem'
                                                    }}
                                                    title="Tocar para cambiar estado de pago"
                                                >
                                                    {appt.is_paid ? (
                                                        <span style={{ color: '#10B981', fontWeight: 'bold' }}>PAGADO</span>
                                                    ) : (
                                                        <span style={{ color: '#EF4444', fontWeight: 'bold' }}>IMPAGO</span>
                                                    )}
                                                </button>
                                            </td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.note || '-'}</td>
                                        </tr>
                                    );
                                })}
                                {filteredAppointments.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No se encontraron turnos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
