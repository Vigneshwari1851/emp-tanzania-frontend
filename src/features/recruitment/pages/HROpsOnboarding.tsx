import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Clock, FileCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import axiosInstance from '@/shared/services/axiosInstance';
import { toast } from 'sonner';

import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';

const HROpsOnboarding: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useOrgNavigate();

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/recruitment/candidates');
      if (res.data.success) {
        const onboardingCandidates = res.data.data
          .map((c: any) => {
            const app = c.applications?.[0] || {};
            return {
              ...c,
              status: app.status || 'APPLIED',
              application_id: app.id,
              bgv_case: app.bgv_case || null
            };
          })
          .filter((c: any) =>
            ['OFFER_ACCEPTED', 'BGV_INITIATED', 'DOCUMENTS_PENDING', 'VERIFICATION_IN_PROGRESS', 'PARTIALLY_VERIFIED', 'REVIEW_REQUIRED', 'ADVERSE_FOUND', 'BGV_IN_PROGRESS', 'BGV_CLEARED', 'BGV_FAILED', 'ONBOARDING'].includes(c.status)
          );
        setCandidates(onboardingCandidates);
      }
    } catch (err) {
      toast.error('Failed to load onboarding pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateBgv = async (applicationId: number) => {
    try {
      const res = await axiosInstance.post('/recruitment/bgv/initiate', { application_id: applicationId });
      if (res.data.success) {
        toast.success('BGV Case Initiated Successfully');
        fetchCandidates();
      }
    } catch (err) {
      toast.error('Failed to initiate BGV');
    }
  };

  const handleConvertToEmployee = async (candidateId: number) => {
    try {
      const res = await axiosInstance.post(`/recruitment/candidates/${candidateId}/convert`);
      if (res.data.success) {
        toast.success('Successfully converted to Employee!');
        fetchCandidates();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to convert to employee');
    }
  };

  return (
    <div className="p-2 space-y-8 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex items-center justify-center shrink-0 text-primary">
            <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Onboarding & BGV Tracker
            </h1>
            <p className="text-[12px] sm:text-sm text-muted-foreground font-medium tracking-wide mt-0.5">
              Manage Background Verifications and Employee Conversions
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'BGV In Progress', value: candidates.filter(c => ['BGV_IN_PROGRESS', 'VERIFICATION_IN_PROGRESS', 'PARTIALLY_VERIFIED', 'DOCUMENTS_PENDING'].includes(c.status)).length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-transparent' },
          { label: 'Review Required', value: candidates.filter(c => c.status === 'REVIEW_REQUIRED').length, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-transparent' },
          { label: 'BGV Cleared', value: candidates.filter(c => c.status === 'BGV_CLEARED' || c.status === 'ONBOARDING').length, icon: ShieldCheck, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-transparent' },
          { label: 'Pending Employee Conversion', value: candidates.filter(c => c.status === 'BGV_CLEARED').length, icon: UserCheck, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-transparent' }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-sm transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tracker Table */}
      <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden mt-8">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            Loading tracking board...
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-muted/50">
            No candidates currently in the onboarding pipeline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/80 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <th className="px-6 py-4 whitespace-nowrap font-semibold text-sm text-black">Candidate Profile</th>
                  <th className="px-6 py-4 whitespace-nowrap font-semibold text-sm text-black">Onboarding Status</th>
                  <th className="px-6 py-4 whitespace-nowrap font-semibold text-sm text-black">BGV Verification</th>
                  <th className="px-6 py-4 whitespace-nowrap font-semibold text-sm text-black">Conversion Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border">
                {candidates.map(candidate => (
                  <tr key={candidate.id} className="hover:bg-muted/40 transition-colors">
                    {/* Candidate Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner border border-primary-100 dark:border-primary-800/60 shrink-0">
                          {candidate.first_name[0]}{candidate.last_name[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{candidate.first_name} {candidate.last_name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{candidate.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Onboarding Status */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-primary/10 text-primary border border-primary-100 dark:border-primary-800/60 whitespace-nowrap">
                        {candidate.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* BGV Action */}
                    <td className="px-6 py-4">
                      {!candidate.bgv_case && candidate.status === 'OFFER_ACCEPTED' ? (
                        <Button size="sm" onClick={() => handleInitiateBgv(candidate.application_id)} className="bg-primary hover:bg-primary/95 text-white w-full max-w-[160px] h-8 text-xs">
                          Initiate BGV
                        </Button>
                      ) : candidate.bgv_case ? (
                        <div className="space-y-1.5">

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full max-w-[160px] text-primary border-primary-200 dark:border-primary-800/60 bg-primary/10 hover:bg-primary-100 dark:hover:bg-primary-900/30 h-8 text-xs font-semibold"
                            onClick={() => navigate(`/onboarding/bgv/${candidate.application_id}`)}
                          >
                            View Verification
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">Awaiting Offer</span>
                      )}
                    </td>

                    {/* Conversion */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleConvertToEmployee(candidate.id)}
                          disabled={candidate.status !== 'BGV_CLEARED'}
                          className={`w-full max-w-[180px] font-semibold shadow-sm h-8 text-xs transition-all ${
                            candidate.status === 'BGV_CLEARED' 
                              ? 'bg-primary hover:bg-primary/95 text-white shadow-primary-200 dark:shadow-primary-950' 
                              : 'bg-muted text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          Convert to Employee
                        </Button>
                        {candidate.status !== 'BGV_CLEARED' && (
                          <span className="text-[10px] text-muted-foreground font-medium">Pending BGV clearance</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default HROpsOnboarding;
