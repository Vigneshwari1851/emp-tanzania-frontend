import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import Select from "@/shared/components/ui/Select";

interface AssetFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isLoading: boolean;
}

const AssetForm: React.FC<AssetFormProps> = ({ initialData, onSubmit, onClose, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    categoryId: '1',
    locationId: '1',
    cost: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        serialNumber: initialData.serial_number || '',
        categoryId: initialData.category_id?.toString() || '1',
        locationId: initialData.location_id?.toString() || '1',
        cost: initialData.cost?.toString() || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{initialData ? 'Edit Asset' : 'Add New Asset'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Asset Name</label>
            <input 
              name="name"
              className="input-field" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. MacBook Pro"
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Serial Number</label>
            <input 
              name="serialNumber"
              className="input-field" 
              value={formData.serialNumber} 
              onChange={handleChange} 
              required 
              placeholder="e.g. SN-12345"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <Select
                value={formData.categoryId}
                onChange={(val) => setFormData({...formData, categoryId: val})}
                label="Category"
                options={[
                  { value: "1", label: "Electronics" },
                  { value: "2", label: "Furniture" },
                  { value: "3", label: "Office Supplies" },
                ]}
              />
            </div>
            <div>
              <Select
                value={formData.locationId}
                onChange={(val) => setFormData({...formData, locationId: val})}
                label="Location"
                options={[
                  { value: "1", label: "Main Office" },
                  { value: "2", label: "Warehouse" },
                  { value: "3", label: "Remote" },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Cost</label>
            <input 
              name="cost"
              type="number"
              className="input-field" 
              value={formData.cost} 
              onChange={handleChange} 
              placeholder="0.00"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : (initialData ? 'Update Asset' : 'Create Asset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetForm;
