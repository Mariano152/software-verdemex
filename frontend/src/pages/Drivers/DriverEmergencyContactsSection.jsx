import { useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../components/Notifications/NotificationModal';
import DriverEmergencyContactModal from './DriverEmergencyContactModal';
import './DriverEmergencyContactsSection.css';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export default function DriverEmergencyContactsSection({
  contacts = [],
  onCreateContact,
  onUpdateContact,
  onDeleteContact
}) {
  const [records, setRecords] = useState(contacts);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isNewContact, setIsNewContact] = useState(false);
  const [modalMode, setModalMode] = useState('edit');

  useEffect(() => {
    setRecords(contacts);
  }, [contacts]);

  const availableRelationships = useMemo(() => (
    Array.from(new Set(
      records
        .map((record) => normalizeText(record.parentesco))
        .filter(Boolean)
    ))
  ), [records]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);

    return records.filter((record) => {
      const relationship = normalizeText(record.parentesco);
      const matchesRelationship = selectedRelationship === 'todos' ? true : relationship === selectedRelationship;
      const searchableText = [record.nombre, record.parentesco, record.numero_telefono]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      return matchesRelationship && matchesSearch;
    });
  }, [records, searchTerm, selectedRelationship]);

  const openNewModal = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedContact(null);
    setIsNewContact(true);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (contact) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedContact(contact);
    setIsNewContact(false);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const openEditModal = (contact) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedContact(contact);
    setIsNewContact(false);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSaveContact = async (formData, contactId) => {
    try {
      const savedContact = contactId
        ? await onUpdateContact(contactId, formData)
        : await onCreateContact(formData);

      setRecords((current) => {
        const exists = current.some((record) => record.id === savedContact.id);
        return exists
          ? current.map((record) => (record.id === savedContact.id ? savedContact : record))
          : [savedContact, ...current];
      });

      setNotification({
        type: 'success',
        title: 'Exito',
        message: contactId ? 'Contacto actualizado correctamente' : 'Contacto creado correctamente'
      });
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo guardar el contacto'
      });
      throw error;
    }
  };

  const handleDelete = async (contactId) => {
    try {
      if (!window.confirm('Seguro que deseas eliminar este contacto de emergencia?')) {
        return;
      }

      await onDeleteContact(contactId);
      setRecords((current) => current.filter((record) => record.id !== contactId));
      setIsModalOpen(false);
      setSelectedContact(null);
      setNotification({
        type: 'success',
        title: 'Exito',
        message: 'Contacto eliminado correctamente'
      });
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar el contacto'
      });
    }
  };

  return (
    <div className="maintenance-section driver-emergency-section">
      <div className="section-header">
        <div className="header-left">
          <div className="header-info">
            <h2>Contacto de emergencia</h2>
            <p className="header-caption">Agrega todos los contactos que necesites para este conductor.</p>
          </div>
        </div>
        <div className="header-right">
          <button type="button" className="maintenance-add-btn" onClick={openNewModal}>
            Agregar contacto
          </button>
        </div>
      </div>

      <div className="maintenance-history-section">
        <div className="maintenance-history-header">
          <div>
            <h3>Historial de contactos</h3>
            <p>Todos los contactos requieren nombre, parentesco y numero.</p>
          </div>
          <button type="button" className="maintenance-add-btn" onClick={openNewModal}>
            Agregar contacto
          </button>
        </div>

        <div className="records-filter-grid">
          <div className="records-search-field">
            <label htmlFor="driver-emergency-search">Buscar contacto</label>
            <input
              id="driver-emergency-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, parentesco o numero"
            />
          </div>

          <label>
            Parentesco
            <select value={selectedRelationship} onChange={(event) => setSelectedRelationship(event.target.value)}>
              <option value="todos">Todos</option>
              {availableRelationships.map((relationship) => (
                <option key={relationship} value={relationship}>{relationship}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="maintenance-records-list">
          {records.length === 0 ? (
            <div className="maintenance-empty-state">
              <p>Aun no hay contactos de emergencia registrados para este conductor.</p>
              <button type="button" className="maintenance-add-btn maintenance-add-btn-inline" onClick={openNewModal}>
                Agregar primer contacto
              </button>
            </div>
          ) : (
            filteredRecords.map((contact) => (
              <div key={contact.id} className="maintenance-record-card">
                <div className="maintenance-record-top">
                  <div>
                    <h4>{contact.nombre}</h4>
                    <p className="maintenance-record-type">{contact.parentesco}</p>
                  </div>
                  <div className="maintenance-record-actions">
                    <button type="button" className="ghost-btn" onClick={() => openViewModal(contact)}>Ver</button>
                    <button type="button" className="ghost-btn" onClick={() => openEditModal(contact)}>Editar</button>
                    <button type="button" className="danger-btn" onClick={() => handleDelete(contact.id)}>Eliminar</button>
                  </div>
                </div>

                <div className="maintenance-record-grid driver-emergency-grid">
                  <div>
                    <span className="record-label">Nombre</span>
                    <strong>{contact.nombre}</strong>
                  </div>
                  <div>
                    <span className="record-label">Parentesco</span>
                    <strong>{contact.parentesco}</strong>
                  </div>
                  <div>
                    <span className="record-label">Numero</span>
                    <strong>{contact.numero_telefono}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {records.length > 0 && filteredRecords.length === 0 && (
          <div className="maintenance-empty-state">
            <p>No se encontraron contactos con los filtros actuales.</p>
          </div>
        )}
      </div>

      <NotificationModal
        isOpen={!!notification}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        onClose={() => setNotification(null)}
      />

      <DriverEmergencyContactModal
        isOpen={isModalOpen}
        contact={selectedContact}
        mode={modalMode}
        isNew={isNewContact}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        onEdit={(contact) => openEditModal(contact)}
        onDelete={(contactId) => handleDelete(contactId)}
      />
    </div>
  );
}
