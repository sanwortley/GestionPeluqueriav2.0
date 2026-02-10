import { useState, useEffect } from 'react';
import api from '../api';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';

export default function AdminBlocks() {
    const [blocks, setBlocks] = useState([]);
    const [formData, setFormData] = useState({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '00:00',
        end_time: '23:59',
        reason: ''
    });

    useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const res = await api.get('/blocks/');
            setBlocks(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('¿Eliminar este bloqueo?')) {
            try {
                await api.delete(`/blocks/${id}/`);
                fetchBlocks();
            } catch (err) {
                alert('Error al eliminar bloqueo: ' + (err.response?.data?.detail || err.message));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/blocks/', formData);
            setFormData({
                start_date: format(new Date(), 'yyyy-MM-dd'),
                end_date: format(new Date(), 'yyyy-MM-dd'),
                start_time: '00:00',
                end_time: '23:59',
                reason: ''
            });
            fetchBlocks();
        } catch (err) {
            alert('Error al crear bloqueo: ' + (err.response?.data?.detail || err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="container">
            <h1 className="title">Gestionar Bloqueos</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 className="subtitle">Nuevo Bloqueo (Rango)</h2>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end" style={{ flexWrap: 'wrap' }}>
                    <div className="form-group flex-1">
                        <label className="label">Fecha Inicio</label>
                        <input
                            type="date" className="input"
                            value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label className="label">Fecha Fin</label>
                        <input
                            type="date" className="input"
                            value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label className="label">Hora Inicio</label>
                        <input
                            type="time" className="input"
                            value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group flex-1">
                        <label className="label">Hora Fin</label>
                        <input
                            type="time" className="input"
                            value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group flex-2">
                        <label className="label">Razón (Ej: Vacaciones)</label>
                        <input
                            type="text" className="input"
                            placeholder="Ej: Vacaciones, Feriado..."
                            value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>
                    <button className="btn btn-primary" style={{ height: '52px', padding: '0 2rem' }}>Crear Bloqueo</button>
                </form>
            </div>

            <div className="grid gap-4">
                <h2 className="subtitle" style={{ fontSize: '1.4rem' }}>Bloqueos Activos</h2>
                {blocks.length === 0 && <p className="text-muted text-center" style={{ padding: '2rem' }}>No hay bloqueos configurados.</p>}
                {blocks.map(b => (
                    <div key={b.id} className="card flex justify-between items-center" style={{ borderLeft: '4px solid var(--danger)' }}>
                        <div>
                            <h3 className="font-bold text-lg" style={{ marginBottom: '0.3rem' }}>
                                {b.start_date === b.end_date ? b.start_date : `${b.start_date} hasta ${b.end_date}`}
                            </h3>
                            <p style={{ color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                Rango horario: {b.start_time} - {b.end_time}
                            </p>
                            <p className="text-muted" style={{ fontStyle: 'italic' }}>
                                Motivo: {b.reason || 'Sin motivo especificado'}
                            </p>
                        </div>
                        <button onClick={() => handleDelete(b.id)} className="btn btn-danger btn-sm">Eliminar</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
