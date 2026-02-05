import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import api from '../api';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'es': es,
    'en-US': enUS
};

const localizer = dateFnsLocalizer({
    format, parse, startOfWeek, getDay, locales
});

export default function AdminDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayAppointments, setDayAppointments] = useState([]);
    const [availabilityMap, setAvailabilityMap] = useState({});

    // Availability Form State
    const [enabled, setEnabled] = useState(true);
    const [slotSize, setSlotSize] = useState(45);
    const [ranges, setRanges] = useState([{ start_time: '10:00', end_time: '13:00' }, { start_time: '14:45', end_time: '21:30' }]);

    const [blocks, setBlocks] = useState([]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');
    const [paidStatus, setPaidStatus] = useState({}); // { id: boolean }

    useEffect(() => {
        fetchAllData();
    }, [currentDate]);

    const fetchAllData = async () => {
        try {
            const [apptsRes, blocksRes] = await Promise.all([
                api.get('/appointments'),
                api.get('/blocks')
            ]);

            const apptEvents = apptsRes.data.map(appt => ({
                id: `appt-${appt.id}`,
                title: `${appt.client_name} - ${appt.service?.name || "Servicio"}`,
                start: new Date(appt.date + 'T' + appt.start_time),
                end: new Date(appt.date + 'T' + appt.end_time),
                resource: appt,
                isBlock: false
            }));

            const blockEvents = [];
            blocksRes.data.forEach(block => {
                // If it's a multi-day block, we show it on each day or as one long block
                // For simplicity and clarity in month view, let's treat it as one event per day if needed, 
                // but Big Calendar handles multi-day well if start/end are set dates.
                blockEvents.push({
                    id: `block-${block.id}`,
                    title: `BLOQUEO: ${block.reason || 'S/M'}`,
                    start: new Date(block.start_date + 'T' + block.start_time),
                    end: new Date(block.end_date + 'T' + block.end_time),
                    resource: block,
                    isBlock: true
                });
            });

            setAppointments([...apptEvents, ...blockEvents]);
            setBlocks(blocksRes.data);
            if (selectedDate) {
                refreshDayAppointments(selectedDate, [...apptEvents, ...blockEvents]);
            }
            fetchAvailabilityMonth(currentDate);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAvailabilityMonth = async (date) => {
        const start = format(subMonths(date, 1), 'yyyy-MM-dd');
        const end = format(addMonths(date, 1), 'yyyy-MM-dd');
        try {
            const res = await api.get(`/availability?from=${start}&to=${end}`);
            const map = {};
            res.data.forEach(d => {
                map[d.date] = d;
            });
            setAvailabilityMap(map);
        } catch (e) {
            console.error(e);
        }
    }

    const handleSelectSlot = async ({ start }) => {
        setSelectedDate(start);
        refreshDayAppointments(start, appointments);

        const dateStr = format(start, 'yyyy-MM-dd');
        const av = availabilityMap[dateStr];

        if (av) {
            setEnabled(av.enabled);
            setSlotSize(av.slot_size_min);
            setRanges(av.ranges);
        } else {
            // New days start disabled and empty as per clean cleanup request
            setEnabled(false);
            setSlotSize(30);
            setRanges([]);
        }
    };

    const refreshDayAppointments = (date, allEvents) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayEvents = allEvents.filter(e => {
            if (e.isBlock) {
                // Check if date is within block range
                const startStr = format(e.start, 'yyyy-MM-dd');
                const endStr = format(e.end, 'yyyy-MM-dd');
                return dateStr >= startStr && dateStr <= endStr;
            } else {
                return format(e.start, 'yyyy-MM-dd') === dateStr;
            }
        });
        setDayAppointments(dayEvents);
    }

    const handleDeleteBlock = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este bloqueo?')) return;
        try {
            await api.delete(`/blocks/${id}`);
            alert('Bloqueo eliminado');
            fetchAllData(); // Refresh everything
        } catch (err) {
            alert('Error al eliminar bloqueo: ' + (err.response?.data?.detail || err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            // Since we don't have a direct "update status" endpoint in the original spec separate from logic, 
            // we use cancel for cancellation. For "Completing" or "No Show" we might need to add logic if strictly required by backend.
            // But user asked to "cancelar".
            // The prompt spec lists: PUT /api/appointments/{id}/cancel

            if (status === 'CANCELLED') {
                if (!confirm('¿Seguro que deseas cancelar este turno?')) return;
                await api.put(`/appointments/${id}/cancel`);
            } else if (status === 'FINISHED') {
                const isPaid = paidStatus[id] || false;
                await api.put(`/appointments/${id}/finish?is_paid=${isPaid}`);
            } else {
                return;
            }

            alert('Turno actualizado');
            fetchAllData();
        } catch (err) {
            alert('Error al actualizar turno');
            console.error(err);
        }
    };

    const handleSaveAvailability = async () => {
        if (!selectedDate) return;
        try {
            const d = format(selectedDate, 'yyyy-MM-dd');
            await api.put(`/availability/${d}`, {
                enabled,
                slot_size_min: slotSize,
                ranges,
                staff_id: null
            });
            alert('Disponibilidad actualizada');
            // Refresh map
            fetchAvailabilityMonth(currentDate);
        } catch (err) {
            alert('Error al guardar');
        }
    };

    const handleRangeChange = (idx, field, val) => {
        const newRanges = [...ranges];
        newRanges[idx][field] = val;
        setRanges(newRanges);
    };

    const addRange = () => {
        setRanges([...ranges, { start_time: '09:00', end_time: '10:00' }]);
    };

    const removeRange = (idx) => {
        const newRanges = ranges.filter((_, i) => i !== idx);
        setRanges(newRanges);
    };

    const dayPropGetter = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const av = availabilityMap[dateStr];

        // Check if date is within any block
        const isBlocked = blocks.some(b =>
            dateStr >= b.start_date && dateStr <= b.end_date
        );

        let style = {};
        if (isBlocked) {
            style = { backgroundColor: 'rgba(239, 68, 68, 0.4)', border: '1px solid var(--danger)' };
        } else if (av) {
            if (!av.enabled) {
                style = { backgroundColor: 'rgba(239, 68, 68, 0.2)' }; // Red-ish for disabled
            } else {
                style = { backgroundColor: 'rgba(16, 185, 129, 0.2)' }; // Green for custom schedule
            }
        }
        return { style };
    }

    const handleNavigate = (newDate) => {
        setCurrentDate(newDate);
    }

    const minTime = new Date();
    minTime.setHours(8, 0, 0);

    const maxTime = new Date();
    maxTime.setHours(23, 0, 0);

    return (
        <div className="flex gap-4 dashboard-grid">
            <div className="flex-2">
                <h1 className="title">Agenda Admin</h1>
                <div style={{ height: 600 }}>
                    <Calendar
                        min={minTime}
                        max={maxTime}
                        localizer={localizer}
                        events={appointments}
                        startAccessor="start"
                        endAccessor="end"
                        selectable
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={(e) => {
                            handleSelectSlot({ start: e.start });
                            if (view === 'month') setView('day');
                        }}
                        view={view}
                        onView={(v) => setView(v)}
                        dayPropGetter={dayPropGetter}
                        onNavigate={handleNavigate}
                        date={currentDate}
                        eventPropGetter={(event) => {
                            if (event.isBlock) {
                                return { style: { backgroundColor: 'var(--danger)', color: 'white', borderRadius: '2px', border: 'none' } };
                            }
                            return { style: { backgroundColor: '#3174ad', borderRadius: '4px' } };
                        }}
                        culture='es'
                        messages={{
                            next: "Sig.",
                            previous: "Ant.",
                            today: "Hoy",
                            month: "Mes",
                            week: "Semana",
                            day: "Día",
                            agenda: "Agenda",
                            allDay: "Todo el día",
                            date: "Fecha",
                            time: "Hora",
                            event: "Turno",
                        }}
                    />
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 10, height: 10, backgroundColor: 'rgba(16, 185, 129, 0.2)' }}></div> Horario Personalizado</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 10, height: 10, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}></div> Cerrado</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 10, height: 10, border: '1px solid #333', opacity: 0.5 }}></div> Sin Configurar (Cerrado)</span>
                </div>
            </div>

            <div style={{ flex: 1 }} className="card">
                <h2 className="subtitle">Detalle del Día</h2>
                {selectedDate ? (
                    <div>
                        <h3>{format(selectedDate, 'dd/MM/yyyy')}</h3>

                        {/* If day is blocked, show a message and hide the availability editor */}
                        {dayAppointments.some(e => e.isBlock) ? (
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--danger)',
                                borderRadius: '4px',
                                marginBottom: '2rem',
                                color: 'var(--danger)',
                                fontWeight: 'bold',
                                textAlign: 'center'
                            }}>
                                ESTE DÍA TIENE UN BLOQUEO ACTIVO.<br />
                                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.8 }}>
                                    Elimina el bloqueo para poder editar la disponibilidad.
                                </span>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0 }}>Disponibilidad</h4>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                                        Habilitado
                                    </label>
                                </div>

                                {enabled && (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                                            <label className="label">Tamaño de Slot (min)</label>
                                            <input type="number" className="input" value={slotSize} onChange={e => setSlotSize(e.target.value)} />
                                        </div>

                                        <div className="form-group">
                                            <label className="label">Rangos (Desde - Hasta)</label>
                                            {ranges.map((r, i) => (
                                                <div key={i} className="flex gap-2 items-center" style={{ marginBottom: '0.5rem' }}>
                                                    <input type="time" className="input" value={r.start_time} onChange={e => handleRangeChange(i, 'start_time', e.target.value)} />
                                                    <span>-</span>
                                                    <input type="time" className="input" value={r.end_time} onChange={e => handleRangeChange(i, 'end_time', e.target.value)} />
                                                    <button onClick={() => removeRange(i)} className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.5rem' }}>✕</button>
                                                </div>
                                            ))}
                                            <button onClick={addRange} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', width: '100%' }}>+ Agregar Rango</button>
                                        </div>
                                    </>
                                )}

                                <button onClick={handleSaveAvailability} className="btn btn-primary w-full" style={{ marginTop: '1.5rem' }}>
                                    GUARDAR CONFIGURACIÓN
                                </button>
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <h4 className="title" style={{ fontSize: '1.2rem', marginBottom: '1rem', textAlign: 'left' }}>Turnos y Bloqueos</h4>
                            {dayAppointments.length === 0 && <p className="text-muted">No hay actividad para este día.</p>}
                            <table style={{ width: '100%', marginTop: '0' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.8rem 0.5rem', fontSize: '0.9rem', textAlign: 'left' }}>Hora</th>
                                        <th style={{ padding: '0.8rem 0.5rem', fontSize: '0.9rem', textAlign: 'left' }}>Cliente / Servicio</th>
                                        <th style={{ padding: '0.8rem 0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dayAppointments.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ verticalAlign: 'top', width: '80px' }}>
                                                <strong style={{ color: e.isBlock ? 'var(--danger)' : 'var(--primary)', fontSize: '1.1rem' }}>
                                                    {e.isBlock ? e.resource.start_time : format(e.start, 'HH:mm')}
                                                </strong>
                                            </td>
                                            <td>
                                                {e.isBlock ? (
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '1px' }}>BLOQUEO</div>
                                                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{e.resource.reason || 'Sin motivo'}</div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem', gap: '1rem' }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff', lineHeight: '1.2' }}>{e.resource.client_name}</span>
                                                            <span style={{
                                                                fontSize: '0.6rem',
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                background: e.resource.status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.2)' :
                                                                    (e.resource.status === 'FINISHED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                                                                color: e.resource.status === 'CONFIRMED' ? '#34D399' :
                                                                    (e.resource.status === 'FINISHED' ? '#60A5FA' : '#F87171'),
                                                                fontWeight: 'bold',
                                                                textTransform: 'uppercase',
                                                                border: '1px solid currentColor',
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0
                                                            }}>
                                                                {e.resource.status === 'CONFIRMED' ? 'CONFIRMADO' :
                                                                    e.resource.status === 'FINISHED' ? 'FINALIZADO' : 'CANCELADO'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', color: '#aaa' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <i className="fas fa-cut" style={{ width: '16px', textAlign: 'center' }}></i> {e.resource.service?.name}
                                                            </span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: paidStatus[e.id.replace('appt-', '')] || e.resource.is_paid ? '#10B981' : '#EF4444' }}>
                                                                <i className={`fas ${paidStatus[e.id.replace('appt-', '')] || e.resource.is_paid ? 'fa-check-circle' : 'fa-times-circle'}`} style={{ width: '16px', textAlign: 'center' }}></i>
                                                                {paidStatus[e.id.replace('appt-', '')] || e.resource.is_paid ? 'COBRADO' : 'IMPAGO'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', width: '180px' }}>
                                                {e.isBlock ? (
                                                    <button
                                                        onClick={() => handleDeleteBlock(e.resource.id)}
                                                        className="btn btn-danger btn-sm"
                                                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        {e.resource.status === 'CONFIRMED' && (
                                                            <>
                                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.7rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={paidStatus[e.id.replace('appt-', '')] || e.resource.is_paid || false}
                                                                        onChange={(ev) => setPaidStatus({ ...paidStatus, [e.id.replace('appt-', '')]: ev.target.checked })}
                                                                    />
                                                                    ¿Pagado?
                                                                </label>
                                                                <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'CANCELLED')}
                                                                        className="btn btn-danger btn-sm"
                                                                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', flex: 1 }}
                                                                    >
                                                                        Anular
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateStatus(e.id.replace('appt-', ''), 'FINISHED')}
                                                                        className="btn btn-primary btn-sm"
                                                                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', flex: 1, backgroundColor: '#10B981', borderColor: '#10B981' }}
                                                                    >
                                                                        Cerrar
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p>Selecciona un día en el calendario.</p>
                )}
            </div>
        </div>
    );
}
