import React, { useState } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Package, UploadCloud, Pencil, Trash2, User, Building, MapPin, Calendar, Users, Hash, ShieldCheck, UserPlus } from 'lucide-react';
import Select from "@/shared/components/ui/Select";
import api from '@/shared/services/axiosInstance';
import { toast } from 'sonner';
import { ModernDatePicker } from '@/shared/components/ui/ModernDatePicker';
import { getProfilePictureUrl } from '@/shared/utils/fileUtils';

const getAssetImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('data:')) return url;
  return getProfilePictureUrl(url) || '';
};

const AssetFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useOrgNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    serialNumber: '',
    locationId: '',
    purchaseDate: '',
    cost: '',
    status: 'AVAILABLE',
    imageUrl: ''
  });

  const [specsData, setSpecsData] = useState<Record<string, string>>({
    brand: '',
    model: '',
    processor: '',
    ram: '',
    storage: '',
    os_version: '',
    mac_address: '',
    device_name: '',
    imei_number: '',
    sim_number: '',
    mobile_number: '',
    carrier: '',
    screen_size: '',
    resolution: '',
    port_types: '',
    accessory_type: '',
    compatibility: '',
    ip_address: '',
    firmware_version: '',
    software_name: '',
    license_key: '',
    license_type: '',
    license_expiry: '',
  });

  // Fetch categories and locations for selects
  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const res = await api.get('/assets/categories');
      return res.data.data || res.data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: async () => {
      const res = await api.get('/assets/locations');
      return res.data.data || res.data;
    }
  });

  // Fetch asset data if editing
  const { data: asset, isLoading: isFetching } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const res = await api.get(`/assets/${id}`);
      const asset = res.data.data || res.data;
      setFormData({
        name: asset.name,
        categoryId: asset.category_id.toString(),
        serialNumber: asset.serial_number,
        locationId: asset.location_id.toString(),
        purchaseDate: asset.purchase_date ? new Date(asset.purchase_date).toISOString().split('T')[0] : '',
        cost: asset.purchase_price?.toString() || asset.cost?.toString() || '',
        status: asset.status,
        imageUrl: asset.image_url || ''
      });

      if (asset.specifications) {
        const specs = typeof asset.specifications === 'string' ? JSON.parse(asset.specifications) : asset.specifications;
        setSpecsData({
          brand: specs.brand || '',
          model: specs.model || '',
          processor: specs.processor || '',
          ram: specs.ram || '',
          storage: specs.storage || '',
          os_version: specs.os_version || '',
          mac_address: specs.mac_address || '',
          device_name: specs.device_name || '',
          imei_number: specs.imei_number || '',
          sim_number: specs.sim_number || '',
          mobile_number: specs.mobile_number || '',
          carrier: specs.carrier || '',
          screen_size: specs.screen_size || '',
          resolution: specs.resolution || '',
          port_types: specs.port_types || '',
          accessory_type: specs.accessory_type || '',
          compatibility: specs.compatibility || '',
          ip_address: specs.ip_address || '',
          firmware_version: specs.firmware_version || '',
          software_name: specs.software_name || '',
          license_key: specs.license_key || '',
          license_type: specs.license_type || '',
          license_expiry: specs.license_expiry || '',
        });
      }
      return asset;
    },
    enabled: isEdit
  });

  const activeAssignment = isEdit && asset?.status === 'ASSIGNED' ? asset?.assignments?.[0] : null;

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return api.put(`/assets/${id}`, data);
      }
      return api.post('/assets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(`Asset ${isEdit ? 'updated' : 'created'} successfully!`);
      navigate('/assets');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully!');
      navigate('/assets');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete asset');
    }
  });

  const handleDelete = () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this asset?')) {
      deleteMutation.mutate(parseInt(id));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty specifications values so we don't save bloated garbage in JSON
    const activeSpecs: Record<string, string> = {};
    Object.keys(specsData).forEach((key) => {
      if (specsData[key] !== '') {
        activeSpecs[key] = specsData[key];
      }
    });

    const submitData = {
      name: formData.name,
      categoryId: formData.categoryId,
      serialNumber: formData.serialNumber,
      locationId: formData.locationId,
      purchaseDate: formData.purchaseDate || undefined,
      status: formData.status,
      purchasePrice: formData.cost ? parseFloat(formData.cost) : undefined,
      imageUrl: formData.imageUrl || '',
      specifications: JSON.stringify(activeSpecs)
    };

    mutation.mutate(submitData);
  };

  if (isEdit && isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full font-poppins space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-primary/95 rounded-sm transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{isEdit ? 'Edit Asset' : 'Add New Asset'}</h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">{isEdit ? `Modifying asset ID: ${formData.serialNumber}` : 'Enter asset details to add to inventory'}</p>
          </div>
        </div>

        {/* Premium Header Actions */}
        {isEdit && asset?.status !== 'ASSIGNED' && (
          <button 
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="h-10 px-4 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 border bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 hover:border-red-300 cursor-pointer text-sm font-poppins"
          >
            {deleteMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
            Delete Asset
          </button>
        )}
      </div>
 
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Main Form Column */}
        <form onSubmit={handleSubmit} className="flex-1 w-full bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          {/* Top Row: Asset Image */}
          <div className="space-y-4 border-b border-border pb-6">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Package size={18} className="text-primary" /> Basic Information
            </h3>
            
            <div>
              <label className="block text-md font-semibold text-muted-foreground mb-2">Asset Image</label>
              <div className="flex items-center gap-6">
                {/* Image Thumbnail / Dropzone Card (Left side) */}
                <div 
                  className={`relative w-48 h-48 rounded-[24px] border-2 bg-card p-2 shadow-sm flex items-center justify-center flex-shrink-0 transition-all ${
                    isDragging 
                      ? 'border-[#14B8A6] bg-[#14B8A6]/5 scale-[0.99]' 
                      : formData.imageUrl 
                        ? 'border-border hover:border-[#14B8A6]/30'
                        : 'border-dashed border-border bg-muted/50/50 hover:border-[#14B8A6] hover:bg-[#14B8A6]/5'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {formData.imageUrl ? (
                    <img 
                      src={getAssetImageUrl(formData.imageUrl)} 
                      alt="Asset Preview" 
                      className="w-full h-full rounded-[18px] object-cover"
                    />
                  ) : (
                    <div className="text-center p-3 text-muted-foreground">
                      <UploadCloud className="w-10 h-10 mx-auto stroke-[1.2] text-[#14B8A6] mb-1 animate-pulse" />
                      <span className="text-[12px] block font-semibold text-muted-foreground">Drag & Drop Here</span>
                    </div>
                  )}
                </div>
                
                {/* Requirements and Controls Division (Right side) */}
                <div className="flex-1 space-y-3.5">
                  <div className="space-y-1.5">
                    <h4 className="text-[12px] font-medium text-foreground">Image Requirements</h4>
                    <ul className="text-md space-y-1 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                        Recommended: <span className="font-semibold text-foreground">512×512px (1:1)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                        File limit: <span className="font-semibold text-foreground">2.0 MB</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                        Formats: <span className="font-semibold text-foreground">PNG, JPG, WEBP</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!formData.imageUrl ? (
                      <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-md font-semibold cursor-pointer shadow-sm transition-colors">
                        <UploadCloud size={13} />
                        Upload Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />
                      </label>
                    ) : (
                      <>
                        <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-[#4338CA] text-white rounded-lg text-md font-semibold cursor-pointer shadow-sm transition-colors">
                          <Pencil size={13} />
                          Change Image
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, imageUrl: '' });
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-md font-semibold shadow-sm transition-colors"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section in a beautifully unified 3-column grid */}
          <div className="space-y-6 pb-4">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Asset Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Row 1 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Asset Name *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-card text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. MacBook Pro 14"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Serial Number *</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-card text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. SN-123456"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                />
              </div>

              <div>
                <Select
                  value={formData.categoryId}
                  onChange={(val) => setFormData({...formData, categoryId: val})}
                  placeholder="Select Category"
                  label="Category *"
                  required
                  options={[
                    { value: "", label: "Select Category" },
                    ...(categories?.map((cat: any) => ({ value: String(cat.id), label: cat.name })) || []),
                  ]}
                />
              </div>

              {/* Row 2 */}
              <div>
                <Select
                  value={formData.locationId}
                  onChange={(val) => setFormData({...formData, locationId: val})}
                  placeholder="Select Location"
                  label="Location *"
                  required
                  options={[
                    { value: "", label: "Select Location" },
                    ...(locations?.map((loc: any) => ({ value: String(loc.id), label: loc.name })) || []),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Purchase Date</label>
                <ModernDatePicker
                  value={formData.purchaseDate}
                  onChange={(date) => setFormData({...formData, purchaseDate: date})}
                  placeholder="Select Purchase Date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cost</label>
                <input 
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-card text-foreground placeholder:text-muted-foreground"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                />
              </div>

              {/* Row 3 */}
              {isEdit && (
                <div>
                  <Select
                    value={formData.status}
                    onChange={(val) => setFormData({...formData, status: val})}
                    label="Status"
                    options={[
                      { value: "AVAILABLE", label: "Available" },
                      { value: "ASSIGNED", label: "Assigned" },
                      { value: "MAINTENANCE", label: "Maintenance" },
                      { value: "DISPOSED", label: "Disposed" },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Specifications Section based on Selected Category */}
          {formData.categoryId && (() => {
            const selectedCat = categories?.find((c: any) => c.id.toString() === formData.categoryId);
            const categoryName = selectedCat?.name || '';
            const lowerName = categoryName.toLowerCase();

            const isLaptop = lowerName.includes('laptop') || lowerName.includes('desktop');
            const isMobile = lowerName.includes('mobile') || lowerName.includes('phone');
            const isMonitor = lowerName.includes('monitor') || lowerName.includes('screen');
            const isNetwork = lowerName.includes('network') || lowerName.includes('router') || lowerName.includes('switch') || lowerName.includes('firewall');
            const isSoftware = lowerName.includes('software') || lowerName.includes('license');

            // Form Fields Layout Helper
            const renderInput = (label: string, name: string, placeholder = '', required = false, type = 'text') => (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{label} {required && '*'}</label>
                <input 
                  type={type}
                  required={required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-card text-foreground placeholder:text-muted-foreground"
                  placeholder={placeholder}
                  value={specsData[name] || ''}
                  onChange={(e) => setSpecsData(prev => ({ ...prev, [name]: e.target.value }))}
                />
              </div>
            );

            return (
              <div className="space-y-6 pt-6 border-t border-border">
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Package size={18} className="text-primary" />
                    Dynamic Specifications ({categoryName})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">These fields are dynamically configured based on the selected asset type.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isLaptop && (
                    <>
                      {renderInput('Brand', 'brand', 'e.g. Apple, Dell', true)}
                      {renderInput('Model', 'model', 'e.g. MacBook Pro, Latitude', true)}
                      {renderInput('Processor', 'processor', 'e.g. Apple M3 Max, Intel i7', true)}
                      {renderInput('RAM', 'ram', 'e.g. 16GB, 32GB', true)}
                      {renderInput('Storage', 'storage', 'e.g. 512GB SSD, 1TB', true)}
                      {renderInput('OS Version', 'os_version', 'e.g. macOS Sonoma, Windows 11', true)}
                      {renderInput('MAC Address', 'mac_address', 'e.g. 00:1A:2B:3C:4D:5E')}
                      {renderInput('Device Name', 'device_name', 'e.g. LTC-LAP-023')}
                    </>
                  )}

                  {isMobile && (
                    <>
                      {renderInput('Brand', 'brand', 'e.g. Apple, Samsung', true)}
                      {renderInput('Model', 'model', 'e.g. iPhone 15 Pro, Galaxy S24', true)}
                      {renderInput('IMEI Number', 'imei_number', 'e.g. 358239058293021', true)}
                      {renderInput('SIM Number', 'sim_number', 'e.g. 899112233445566')}
                      {renderInput('Mobile Number', 'mobile_number', 'e.g. +91 9876543210')}
                      {renderInput('Carrier', 'carrier', 'e.g. Airtel, Vodafone')}
                    </>
                  )}

                  {isMonitor && (
                    <>
                      {renderInput('Brand', 'brand', 'e.g. Dell, LG', true)}
                      {renderInput('Model', 'model', 'e.g. UltraSharp U2723QE', true)}
                      {renderInput('Screen Size', 'screen_size', 'e.g. 27 inch, 32 inch', true)}
                      {renderInput('Resolution', 'resolution', 'e.g. 3840x2160 (4K)', true)}
                      {renderInput('Port Types', 'port_types', 'e.g. HDMI, DisplayPort, USB-C')}
                    </>
                  )}

                  {isNetwork && (
                    <>
                      {renderInput('Brand', 'brand', 'e.g. Cisco, Ubiquiti', true)}
                      {renderInput('Model', 'model', 'e.g. Dream Machine Pro, Catalyst 9300', true)}
                      {renderInput('IP Address', 'ip_address', 'e.g. 192.168.1.1', true)}
                      {renderInput('MAC Address', 'mac_address', 'e.g. 00:1A:2B:3C:4D:5E')}
                      {renderInput('Firmware Version', 'firmware_version', 'e.g. v1.12.3')}
                      {renderInput('Port Count', 'port_count', 'e.g. 24, 48', false, 'number')}
                    </>
                  )}

                  {isSoftware && (
                    <>
                      {renderInput('Software Name', 'software_name', 'e.g. Adobe Creative Cloud, Microsoft 365', true)}
                      {renderInput('License Key', 'license_key', 'e.g. XXXX-XXXX-XXXX-XXXX', true)}
                      {renderInput('License Type', 'license_type', 'e.g. SaaS Subscription, Perpetual', true)}
                      {renderInput('License Expiry', 'license_expiry', '', true, 'date')}
                    </>
                  )}

                  {!isLaptop && !isMobile && !isMonitor && !isNetwork && !isSoftware && (
                    <>
                      {renderInput('Brand', 'brand', 'e.g. Logitech, HP')}
                      {renderInput('Model', 'model', 'e.g. MX Master 3S')}
                      {renderInput('Accessory Type', 'accessory_type', 'e.g. Mouse, Keyboard, Adapter')}
                      {renderInput('Compatibility', 'compatibility', 'e.g. Windows, Mac, iPadOS')}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
 
          <div className="pt-6 border-t border-border flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => navigate('/assets')}
              className="h-10 bg-card border border-border hover:bg-muted text-foreground font-semibold px-4 rounded-sm shadow-sm transition-all group"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={mutation.isPending}
              className="h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-6 shadow-sm border-none rounded-sm flex items-center gap-2 transition-all"
            >
              {mutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isEdit ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
 
        {/* Sidebar Guidelines */}
        <div className="w-full xl:w-[380px] flex-shrink-0 space-y-6">
          {activeAssignment && (
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 font-poppins space-y-6">
              <h3 className="text-base font-semibold text-foreground pb-3 border-b border-border flex items-center gap-2">
                <User size={18} className="text-primary" /> Custodian Details
              </h3>
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-normal text-xs shadow-sm">
                  {activeAssignment.user?.details?.first_name?.[0] || activeAssignment.user?.username?.[0] || 'U'}
                </div>
                <div>
                  <h4 className="text-[12px] font-medium text-foreground leading-tight">
                    {activeAssignment.user?.details?.first_name 
                      ? `${activeAssignment.user.details.first_name} ${activeAssignment.user.details.last_name || ''}`.trim()
                      : activeAssignment.user?.username || 'Custodian'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal leading-none">{activeAssignment.user?.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                    <Hash size={13} className="text-muted-foreground" /> Employee ID
                  </span>
                  <span className="text-xs font-normal text-foreground font-mono">
                    {activeAssignment.user?.details?.employee_id || activeAssignment.user?.username || `ID: ${activeAssignment.user_id}`}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                    <Building size={13} className="text-muted-foreground" /> Department
                  </span>
                  <span className="text-xs font-normal text-foreground text-right truncate max-w-[200px]">
                    {activeAssignment.user?.details?.department?.department_name || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                    <Users size={13} className="text-muted-foreground" /> Team
                  </span>
                  <span className="text-xs font-normal text-foreground text-right truncate max-w-[200px]">
                    {activeAssignment.user?.details?.team?.team_name || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                    <MapPin size={13} className="text-muted-foreground" /> Branch
                  </span>
                  <span className="text-xs font-normal text-foreground text-right truncate max-w-[200px]">
                    {activeAssignment.user?.details?.department?.branch?.branch_name || activeAssignment.user?.details?.work_location || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted-foreground" /> Joining Date
                  </span>
                  <span className="text-xs font-normal text-foreground font-mono">
                    {activeAssignment.user?.details?.start_date
                      ? new Date(activeAssignment.user.details.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted-foreground" /> Handover Date
                  </span>
                  <span className="text-xs font-normal text-primary font-mono">
                    {activeAssignment.issue_date
                      ? new Date(activeAssignment.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isEdit && !activeAssignment && (
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 font-poppins space-y-5">
              <h3 className="text-base font-semibold text-foreground pb-3 border-b border-border flex items-center gap-2">
                <User size={18} className="text-primary" /> Custodian Details
              </h3>
              <div className="py-5 px-5 bg-muted/50/50 border border-border/80 rounded-lg flex flex-col items-center text-center space-y-3.5">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100/50 rounded-lg flex items-center justify-center shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="text-[12px] font-medium text-foreground leading-tight">Asset is Available</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed font-medium">
                    This asset is currently in storage. Assign custody to an employee to activate tracking.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/assets/assign/${id}`)}
                className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-sm border-none rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                <UserPlus size={16} /> Assign Custodian
              </button>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white shadow-sm border-none rounded-lg p-6 font-poppins">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Package size={18} /> Asset Guidelines
            </h3>
            <ul className="space-y-4 text-primary-50/90">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center flex-shrink-0 text-md font-bold">1</div>
                <p className="text-sm">Ensure the **Serial Number** is unique and matches the physical label on the device.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center flex-shrink-0 text-md font-bold">2</div>
                <p className="text-sm">Select the correct **Category** to help with filtering and reporting later.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center flex-shrink-0 text-md font-bold">3</div>
                <p className="text-sm">If the asset is purchased today, leave the **Purchase Date** as current.</p>
              </li>
            </ul>
          </div>
 
          <div className="bg-card rounded-lg border border-border shadow-sm p-6 font-poppins">
            <h4 className="text-[12px] font-medium text-foreground mb-3">Pro Tips</h4>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50/50 border border-border rounded-lg text-md text-slate-600">
                <span className="text-primary font-semibold">Tip:</span> You can use a barcode scanner to fill the Serial Number field quickly.
              </div>
              <div className="p-3 bg-muted/50/50 border border-border rounded-lg text-md text-slate-600">
                <span className="text-emerald-600 font-semibold">Audit:</span> Every change to this asset will be logged for security auditing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetFormPage;

