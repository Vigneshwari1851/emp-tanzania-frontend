import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, User, Loader2, Check } from 'lucide-react';
import api from '@/shared/services/axiosInstance';

interface AssignAssetModalProps {
  assetId: number;
  assetName: string;
  onClose: () => void;
  onAssign: (userId: string) => void;
  isLoading: boolean;
}

const AssignAssetModal: React.FC<AssignAssetModalProps> = ({ assetName, onClose, onAssign, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-list', searchTerm],
    queryFn: async () => {
      const response = await api.get('/employees', {
        params: { search: searchTerm, limit: 10 }
      });
      return response.data.data || response.data;
    }
  });

  const employees = Array.isArray(data) ? data : (data?.data || []);

  const handleAssign = () => {
    if (selectedUserId) {
      onAssign(selectedUserId);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-lg shadow-sm w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card sticky top-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">Assign Asset</h3>
            <p className="text-xs text-muted-foreground">Assigning: <span className="font-semibold text-blue-600">{assetName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="Search employee by name, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto flex-1 min-h-[300px]">
            {isLoadingEmployees ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <Loader2 className="animate-spin mb-2" />
                <p className="text-sm">Finding employees...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No employees found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {employees.map((emp: any) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedUserId(emp.id.toString())}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedUserId === emp.id.toString() 
                        ? 'bg-blue-50 border-2 border-blue-500' 
                        : 'bg-card border-2 border-transparent hover:bg-muted'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      selectedUserId === emp.id.toString() ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {emp.details?.first_name?.[0] || emp.username?.[0] || 'U'}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold text-foreground">
                        {emp.details?.first_name} {emp.details?.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">{emp.email}</div>
                    </div>
                    {selectedUserId === emp.id.toString() && (
                      <div className="bg-primary text-white rounded-full p-1">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-muted flex items-center justify-between border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:text-foreground">
            Cancel
          </button>
          <button 
            onClick={handleAssign}
            disabled={!selectedUserId || isLoading}
            className={`btn btn-primary px-8 flex items-center gap-2 ${(!selectedUserId || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Assign Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAssetModal;
