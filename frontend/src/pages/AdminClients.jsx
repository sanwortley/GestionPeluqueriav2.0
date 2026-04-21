import { useState, useEffect } from 'react';
import api from '../api';
import { format } from 'date-fns';
import { Pencil, Trash2, X, Check } from 'lucide-react';

export default function AdminClients() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 50;

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchClients(0, true);
    }, []);

    const fetchClients = async (skip = 0, isNew = false) => {
        try {
            if (isNew) setLoading(true);
            const res = await api.get(`clients/?skip=${skip}&limit=${LIMIT}&search=${searchTerm}`);
            const newData = res.data;
            
            if (isNew) {
                setClients(newData);
            } else {
                setClients(prev => [...prev, ...newData]);
            }
            
            setHasMore(newData.length === LIMIT);
            setPage(skip + LIMIT);
        } catch (err) {
            console.error("Error fetching clients", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(0);
        fetchClients(0, true);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchClients(page);
        }
    };



    const [editingClient, setEditingClient] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });

    const handleEditClick = (client) => {
        setEditingClient(client);
        setEditForm({
            name: client.name,
            phone: client.phone,
            email: client.email || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`clients/${editingClient.id}`, editForm);
            setClients(clients.map(c => c.id === editingClient.id ? res.data : c));
            setEditingClient(null);
        } catch (err) {
            alert("Error al actualizar cliente");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de que querés eliminar este cliente?")) return;
        try {
            await api.delete(`clients/${id}`);
            setClients(clients.filter(c => c.id !== id));
        } catch (err) {
            alert("Error al eliminar cliente");
        }
    };

    if (loading) return <div className="p-4 text-white">Cargando clientes...</div>;

    return (
        <>
            <div className="container animate-fade-in">
            <h1 className="title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Cartera de Clientes</h1>
            
            <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        className="input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>Buscar</button>
                    {searchTerm && (
                        <button type="button" className="btn btn-secondary" onClick={() => { setSearchTerm(''); setPage(0); fetchClients(0, true); }}>Limpiar</button>
                    )}
            </form>

            <div className="card" style={{ padding: '0' }}>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Registrado</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.id}>
                                    <td>#{client.id}</td>
                                    <td style={{ fontWeight: 'bold' }}>{client.name}</td>
                                    <td className="text-muted">{client.phone}</td>
                                    <td className="text-muted">
                                        {client.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy') : '-'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => handleEditClick(client)}
                                                className="btn-icon"
                                                title="Editar"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(client.id)}
                                                className="btn-icon btn-icon-danger"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr className="empty-row">
                                    <td colSpan="5">
                                        No hay clientes registrados aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {hasMore && clients.length > 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button 
                            onClick={loadMore} 
                            className="btn btn-secondary" 
                            disabled={loading}
                            style={{ padding: '0.6rem 2rem' }}
                        >
                            {loading ? 'Cargando...' : 'Cargar más clientes'}
                        </button>
                    </div>
                )}
            </div>
            </div>
            {editingClient && (
                <div className="modal-overlay">
                    <div className="modal-content animate-slide-up" style={{ maxWidth: '320px' }}>
                        <div className="modal-header" style={{ padding: '0.9rem 1.2rem' }}>
                            <h2 style={{ fontSize: '1rem', margin: 0 }}>Editar Cliente</h2>
                            <button onClick={() => setEditingClient(null)} className="btn-close">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div style={{ padding: '1rem 1.2rem' }}>
                                <div className="form-group">
                                    <label className="label" style={{ fontSize: '0.8rem' }}>Nombre</label>
                                    <input 
                                        type="text" 
                                        className="input"
                                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                                        value={editForm.name}
                                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="label" style={{ fontSize: '0.8rem' }}>Teléfono</label>
                                    <input 
                                        type="tel" 
                                        className="input"
                                        style={{ padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
                                        value={editForm.phone}
                                        onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button type="button" onClick={() => setEditingClient(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
