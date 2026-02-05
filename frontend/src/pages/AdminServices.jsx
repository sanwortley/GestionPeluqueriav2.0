import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminServices() {
    const [services, setServices] = useState([]);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', duration_min: 45, price: 0 });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await api.get('/services');
            setServices(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Eliminar servicio?')) {
            await api.delete(`/services/${id}`);
            fetchServices();
        }
    };

    const handleEdit = (s) => {
        setEditing(s);
        setFormData({ name: s.name, duration_min: s.duration_min, price: s.price || 0 });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/services/${editing.id}`, formData);
            } else {
                await api.post('/services', formData);
            }
            setEditing(null);
            setFormData({ name: '', duration_min: 45, price: 0 });
            fetchServices();
        } catch (err) {
            alert('Error');
        }
    };

    return (
        <div className="container">
            <h1 className="title">Gestionar Servicios</h1>

            <div className="card">
                <h2 className="subtitle">{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
                    <div className="input-group" style={{ flex: 2, minWidth: '200px' }}>
                        <label className="label">Nombre del Servicio</label>
                        <input
                            type="text" placeholder="Ej: Corte Masculino" className="input width-100"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group" style={{ flex: 1, minWidth: '120px' }}>
                        <label className="label">Duración (min)</label>
                        <input
                            type="number" placeholder="45" className="input width-100"
                            value={formData.duration_min} onChange={e => setFormData({ ...formData, duration_min: parseInt(e.target.value) })}
                            required
                        />
                    </div>
                    <div className="input-group" style={{ flex: 1, minWidth: '120px' }}>
                        <label className="label">Precio ($)</label>
                        <input
                            type="number" placeholder="0" className="input width-100"
                            value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-primary">{editing ? 'Actualizar' : 'Crear'}</button>
                        {editing && <button type="button" onClick={() => setEditing(null)} className="btn btn-secondary">Cancelar</button>}
                    </div>
                </form>
            </div>

            <div className="grid gap-4">
                {services.map(s => (
                    <div key={s.id} className="card flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{s.name}</h3>
                            <p className="text-muted">{s.duration_min} min - ${s.price}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(s)} className="btn btn-secondary btn-sm">Editar</button>
                            <button onClick={() => handleDelete(s.id)} className="btn btn-danger btn-sm">Eliminar</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
