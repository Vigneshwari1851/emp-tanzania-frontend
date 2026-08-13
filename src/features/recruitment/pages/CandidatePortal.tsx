import React, { useState } from 'react';
import { Mail, KeyRound, CheckCircle2, ChevronRight, Download, UploadCloud, XCircle, ShieldCheck, Clock, FileText, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/Input';
import FileUpload from '@/shared/components/ui/FileUpload';
import { toast } from 'sonner';
import axiosInstance from '@/shared/services/axiosInstance';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';

const CandidatePortal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'LOGIN' | 'OTP' | 'DASHBOARD'>('LOGIN');
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Document states
  const [idFiles, setIdFiles] = useState<any[]>([]);
  const [addressFiles, setAddressFiles] = useState<any[]>([]);
  const [eduFiles, setEduFiles] = useState<any[]>([]);
  
  // Onboarding tasks states
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [bankDetails, setBankDetails] = useState({ account_number: '', bank_name: '', ifsc_code: '' });
  const [bankSubmitted, setBankSubmitted] = useState(false);
  
  const navigate = useOrgNavigate();

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${authToken}` }
  });

  const handleGenerateOTP = async () => {
    if (!email) return toast.error('Please enter your email address');
    if (!consent) return toast.error('You must consent to data processing to proceed');
    try {
      setLoading(true);
      const res = await axiosInstance.post('/recruitment/otp/generate', { email, consent: true });
      if (res.data.success) {
        toast.success('OTP sent to your email');
        setStep('OTP');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return toast.error('Please enter the OTP');
    try {
      setLoading(true);
      const res = await axiosInstance.post('/recruitment/otp/verify', { email, otp });
      if (res.data.success) {
        toast.success('Authentication successful');
        setAuthToken(res.data.data.token);
        fetchCandidateDetails(res.data.data.candidate.id, res.data.data.token);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateDetails = async (id: number, token?: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/recruitment/portal/${id}`, {
        headers: { Authorization: `Bearer ${token || authToken}` }
      });
      if (res.data.success) {
        const data = res.data.data;
        setCandidate(data);
        setPoliciesAccepted(data.policies_accepted || false);
        if (data.bank_details) {
          setBankDetails(data.bank_details);
          setBankSubmitted(true);
        } else {
          setBankDetails({ account_number: '', bank_name: '', ifsc_code: '' });
          setBankSubmitted(false);
        }
        setStep('DASHBOARD');
      }
    } catch (err) {
      toast.error('Failed to load candidate details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    try {
      setLoading(true);
      const res = await axiosInstance.put(`/recruitment/offers/${offerId}/accept`, {}, getHeaders());
      if (res.data.success) {
        toast.success('Offer Accepted! Welcome aboard.');
        fetchCandidateDetails(candidate.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.put(`/recruitment/candidates/${candidate.id}/status`, { status: 'WITHDRAWN' }, getHeaders());
      if (res.data.success) {
        toast.success('Application withdrawn.');
        fetchCandidateDetails(candidate.id);
      }
    } catch (err: any) {
      toast.error('Failed to withdraw');
    } finally {
      setLoading(false);
    }
  };

  const handleNegotiate = async (offerId: number) => {
    const desiredSalary = prompt("Enter your expected Base Salary:");
    if (!desiredSalary) return;
    
    try {
      setLoading(true);
      const res = await axiosInstance.put(`/recruitment/offers/${offerId}/revise`, {
        base_salary: Number(desiredSalary),
        expiry_date: new Date(new Date().setDate(new Date().getDate() + 7))
      }, getHeaders());
      if (res.data.success) {
        toast.success('Negotiation requested sent.');
        fetchCandidateDetails(candidate.id);
      }
    } catch (err: any) {
      toast.error('Failed to submit negotiation');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPDF = () => {
    toast.success('Downloading Offer Letter PDF...');
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', 'Offer_Letter.pdf');
    document.body.appendChild(link);
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  const handleUploadDoc = async (docType: string, filesArray: any[]) => {
    if (filesArray.length === 0) return;
    try {
      setLoading(true);
      const fakeUrl = `https://lattium-docs.s3.amazonaws.com/${docType.toLowerCase()}_${Date.now()}.pdf`;
      const res = await axiosInstance.post(`/recruitment/candidates/${candidate.id}/documents`, {
        document_type: docType,
        file_url: fakeUrl
      }, getHeaders());
      if (res.data.success) {
        toast.success(`${docType.replace(/_/g, ' ')} uploaded successfully!`);
        fetchCandidateDetails(candidate.id);
      }
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPolicies = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.put(`/recruitment/candidates/${candidate.id}/onboarding`, {
        policies_accepted: true
      }, getHeaders());
      if (res.data.success) {
        setPoliciesAccepted(true);
        toast.success('Corporate Policies accepted successfully!');
        fetchCandidateDetails(candidate.id);
      }
    } catch (err) {
      toast.error('Failed to sign policies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankDetails.account_number || !bankDetails.bank_name || !bankDetails.ifsc_code) {
      return toast.error('Please fill in all bank details');
    }
    try {
      setLoading(true);
      const res = await axiosInstance.put(`/recruitment/candidates/${candidate.id}/onboarding`, {
        bank_details: bankDetails
      }, getHeaders());
      if (res.data.success) {
        setBankSubmitted(true);
        toast.success('Bank details submitted successfully!');
        fetchCandidateDetails(candidate.id);
      }
    } catch (err) {
      toast.error('Failed to submit payroll details');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'LOGIN' || step === 'OTP') {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-lg mx-auto flex items-center justify-center shadow-sm shadow-primary-200 mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Candidate Portal</h1>
            <p className="text-muted-foreground mt-2">Secure access to your recruitment journey.</p>
          </div>

          <Card className="border-none shadow-sm shadow-gray-200/50 rounded-lg overflow-hidden">
            <CardContent className="p-8">
              {step === 'LOGIN' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Registered Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john.doe@example.com"
                        className="pl-10 h-12 rounded-lg bg-muted border-border focus:bg-card"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-left mb-4">
                    <input 
                      type="checkbox" 
                      id="consent" 
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary mt-1 cursor-pointer" 
                    />
                    <label htmlFor="consent" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                      I hereby consent to Lattium processing my personal data and documents for employment verification and onboarding purposes.
                    </label>
                  </div>
                  <Button 
                    onClick={handleGenerateOTP}
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary/95 text-white rounded-lg shadow-sm shadow-primary-200"
                  >
                    {loading ? 'Sending...' : 'Send Secure OTP'}
                    {!loading && <ChevronRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary-100 flex items-start gap-3">
                    <Mail className="w-5 h-5 shrink-0" />
                    <p>An OTP has been sent to <strong>{email}</strong>. Please enter it below.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">One-Time Password (OTP)</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        type="text" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="pl-10 h-12 rounded-lg bg-muted border-border focus:bg-card text-center tracking-widest font-mono text-lg"
                        maxLength={6}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleVerifyOTP}
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary/95 text-white rounded-lg shadow-sm shadow-primary-200"
                  >
                    {loading ? 'Verifying...' : 'Verify & Secure Login'}
                  </Button>
                  <div className="text-center">
                    <button onClick={() => setStep('LOGIN')} className="text-sm text-muted-foreground hover:text-primary font-medium">
                      Use a different email address
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle Exceptional States
  if (candidate && ['WITHDRAWN', 'LOCKED', 'NO_SHOW'].includes(candidate.status)) {
    return (
      <div className="min-h-screen bg-muted font-sans">
        <nav className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="w-full h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground tracking-tight">Candidate Portal</span>
            </div>
          </div>
        </nav>
        <div className="max-w-md mx-auto mt-20 p-6">
          <Card className="border-none shadow-sm rounded-lg overflow-hidden bg-card text-center p-8 space-y-6">
            {candidate.status === 'LOCKED' ? (
              <>
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center">
                  <XCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
                <p className="text-muted-foreground">Your portal account has been locked due to 3 failed OTP authentication attempts. For security reasons, direct access is disabled.</p>
                <div className="pt-4 border-t border-border text-sm text-muted-foreground">
                  Please contact the HR Operations team at <strong className="text-primary">onboarding@lattium.com</strong> to verify your identity and unlock your access.
                </div>
              </>
            ) : candidate.status === 'WITHDRAWN' ? (
              <>
                <div className="w-20 h-20 bg-muted text-muted-foreground rounded-full mx-auto flex items-center justify-center">
                  <XCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Application Withdrawn</h2>
                <p className="text-muted-foreground">You have declined the employment offer or requested to withdraw your application. Your onboarding workflow is suspended.</p>
                <div className="pt-4 border-t border-border text-sm text-muted-foreground">
                  We wish you the very best in your future endeavors. If this was a mistake, please reach out to your recruiter.
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full mx-auto flex items-center justify-center">
                  <Clock className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Appointment Cancelled</h2>
                <p className="text-muted-foreground">Your application status is marked as No-Show. The onboarding contract and offer have been archived.</p>
                <div className="pt-4 border-t border-border text-sm text-muted-foreground">
                  Please contact HR Operations if you believe this is an error or wish to reschedule your joining timeline.
                </div>
              </>
            )}
            <Button onClick={() => setStep('LOGIN')} className="w-full bg-primary hover:bg-primary/95 text-white rounded-lg">
              Return to Login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard View
  const latestOffer = candidate?.offers?.length > 0 
    ? candidate.offers.sort((a: any, b: any) => b.id - a.id)[0] 
    : null;

  const isOfferExpired = latestOffer && latestOffer.status === 'SENT' && new Date() > new Date(latestOffer.expiry_date);
  const isRevisedOffer = latestOffer && latestOffer.version >= 2;

  // Onboarding Tasks Percentage
  const idUploaded = candidate?.documents?.some((d: any) => d.document_type === 'ID_PROOF') || false;
  const addressUploaded = candidate?.documents?.some((d: any) => d.document_type === 'ADDRESS_PROOF') || false;
  const educationUploaded = candidate?.documents?.some((d: any) => d.document_type === 'EDUCATION_PROOF') || false;

  let progressPercent = 0;
  if (idUploaded) progressPercent += 20;
  if (addressUploaded) progressPercent += 20;
  if (educationUploaded) progressPercent += 20;
  if (policiesAccepted) progressPercent += 20;
  if (bankSubmitted) progressPercent += 20;

  return (
    <div className="min-h-screen bg-muted font-sans">
      {/* Top Navbar */}
      <nav className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="w-full h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Candidate Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-foreground">{candidate?.first_name} {candidate?.last_name}</p>
              <p className="text-xs text-muted-foreground">{candidate?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary-100 flex items-center justify-center text-primary font-bold">
              {candidate?.first_name?.[0]}{candidate?.last_name?.[0]}
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full py-8 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        
        {/* Welcome Banner */}
        <div className="bg-card p-8 rounded-lg border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          <div className="relative z-10 space-y-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Welcome, {candidate?.first_name}!</h2>
              <p className="text-muted-foreground text-lg">
                {candidate?.status === 'OFFER_SENT' ? 'You have a pending offer waiting for your review.' :
                 candidate?.status === 'OFFER_ACCEPTED' ? 'Congratulations! Please complete your onboarding tasks.' :
                 candidate?.status === 'EMPLOYEE_CREATED' ? 'Your profile is fully converted. See you on Day 1!' :
                 `Your current application status is: ${candidate?.status.replace(/_/g, ' ')}`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTimeline(true)} className="h-9 px-4 rounded-lg border-primary-200 text-primary bg-primary/10 hover:bg-primary-100 flex items-center font-semibold text-xs transition-all">
              <Clock className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
              View Application Journey
            </Button>
          </div>
          <div className="relative z-10">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-primary-100 text-primary border border-primary-200">
              <Clock className="w-4 h-4 mr-2" />
              {candidate?.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Expired Offer Section */}
        {latestOffer && latestOffer.status === 'SENT' && isOfferExpired && (
          <Card className="border-red-100 bg-red-50/50 shadow-sm rounded-lg overflow-hidden p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Employment Offer Expired</h3>
            <p className="text-gray-600 max-w-md mx-auto text-sm">
              The deadline for reviewing and accepting this offer ({new Date(latestOffer.expiry_date).toLocaleDateString()}) has passed. This offer is no longer valid.
            </p>
            <div className="text-sm font-medium text-muted-foreground">
              Please contact your recruiting officer to request a deadline extension or a revised offer letter.
            </div>
          </Card>
        )}

        {/* Offer Review Section */}
        {latestOffer && latestOffer.status === 'SENT' && !isOfferExpired && candidate?.status !== 'WITHDRAWN' && (
          <Card className="border-primary-100 shadow-sm shadow-primary-100/50 rounded-lg overflow-hidden">
            <CardHeader className="bg-primary p-8 text-white">
              <CardTitle className="text-2xl font-bold flex items-center">
                <FileText className="w-6 h-6 mr-3" />
                Action Required: Offer of Employment
              </CardTitle>
              <p className="text-primary-100 mt-2 font-medium">Please review the details of your offer below.</p>
            </CardHeader>
            <CardContent className="p-8 bg-card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <div className="p-6 bg-muted rounded-lg border border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Offer Details</h3>
                    <div className="grid grid-cols-2 gap-y-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Base Salary</p>
                        <p className="text-xl font-bold text-foreground mt-1">{latestOffer.currency} {Number(latestOffer.base_salary).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Offer Expiry</p>
                        <p className="text-xl font-bold text-foreground mt-1">{new Date(latestOffer.expiry_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="text-lg font-medium text-foreground mt-1">v{latestOffer.version}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-center gap-4">
                  <Button className="w-full h-14 bg-primary hover:bg-primary/95 text-white font-bold rounded-lg shadow-sm shadow-primary-200 text-lg transition-all active:scale-95 animate-bounce"
                          onClick={() => handleAcceptOffer(latestOffer.id)}
                          disabled={loading}>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Accept Offer
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-foreground font-semibold rounded-lg border-border hover:bg-muted"
                          onClick={handleDownloadPDF}
                          disabled={loading}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Offer
                  </Button>
                  
                  {!isRevisedOffer ? (
                    <Button variant="outline" className="w-full h-12 text-gray-600 font-semibold rounded-lg"
                            onClick={() => handleNegotiate(latestOffer.id)}
                            disabled={loading}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Request Negotiation
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-2 font-medium bg-muted border border-dashed rounded-lg border-border">
                      🔒 Single negotiation revision cycle completed.
                    </div>
                  )}

                  <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                          onClick={handleWithdraw}
                          disabled={loading}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline & Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Onboarding Tasks Section */}
        {['OFFER_ACCEPTED', 'BGV_IN_PROGRESS', 'BGV_CLEARED', 'BGV_FAILED', 'ONBOARDING'].includes(candidate?.status) && (
          <div className="space-y-8">
            
            {/* Onboarding Progress Dashboard */}
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 p-8 rounded-lg text-white shadow-sm shadow-primary-100 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-80 h-80 bg-card/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[12px] font-medium tracking-wider uppercase opacity-80">Onboarding Roadmap Progress</h4>
                    <p className="text-3xl font-extrabold mt-1">{progressPercent}% Complete</p>
                  </div>
                  <span className="bg-card/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    {progressPercent === 100 ? 'Ready for Day 1!' : 'Pending Actions'}
                  </span>
                </div>
                
                <div className="w-full bg-card/25 rounded-full h-3.5 overflow-hidden">
                  <div 
                    className="bg-card h-3.5 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center text-[10px] md:text-xs pt-2 font-medium opacity-90">
                  <div className={idUploaded ? 'font-bold underline decoration-2' : 'opacity-60'}>ID Proof</div>
                  <div className={addressUploaded ? 'font-bold underline decoration-2' : 'opacity-60'}>Address</div>
                  <div className={educationUploaded ? 'font-bold underline decoration-2' : 'opacity-60'}>Education</div>
                  <div className={policiesAccepted ? 'font-bold underline decoration-2' : 'opacity-60'}>Policies Signed</div>
                  <div className={bankSubmitted ? 'font-bold underline decoration-2' : 'opacity-60'}>Bank Locked</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">Onboarding & Compliance Tasks</h3>
              <p className="text-muted-foreground mt-1">Please complete the following actions to finalize your onboarding.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Documents Vault */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
                  <CardHeader className="bg-primary/10/50 p-6 border-b border-border">
                    <CardTitle className="text-lg font-bold text-foreground flex items-center">
                      <UploadCloud className="w-5 h-5 text-primary mr-2" />
                      Document Vault (BGV Prerequisites)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Upload high-resolution scans of your personal artifacts.</p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {/* Identity Proof */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] font-medium text-foreground">1. Identity Proof (Passport / Aadhaar / Voter ID)</h4>
                        {idUploaded && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Uploaded
                          </span>
                        )}
                      </div>
                      <FileUpload
                        onFilesChange={(files) => {
                          setIdFiles(files);
                          if (files.length > 0) handleUploadDoc('ID_PROOF', files);
                        }}
                        files={idFiles}
                        allowedFormats={['JPG', 'PNG', 'PDF']}
                        multiple={false}
                        disabled={loading}
                        className="border border-border rounded-lg p-2 bg-muted/50"
                      />
                    </div>

                    {/* Address Proof */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] font-medium text-foreground">2. Address Proof (Utility Bill / Rental Agreement)</h4>
                        {addressUploaded && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Uploaded
                          </span>
                        )}
                      </div>
                      <FileUpload
                        onFilesChange={(files) => {
                          setAddressFiles(files);
                          if (files.length > 0) handleUploadDoc('ADDRESS_PROOF', files);
                        }}
                        files={addressFiles}
                        allowedFormats={['JPG', 'PNG', 'PDF']}
                        multiple={false}
                        disabled={loading}
                        className="border border-border rounded-lg p-2 bg-muted/50"
                      />
                    </div>

                    {/* Education Proof */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] font-medium text-foreground">3. Education Verification (Degree Certificate / Marksheets)</h4>
                        {educationUploaded && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Uploaded
                          </span>
                        )}
                      </div>
                      <FileUpload
                        onFilesChange={(files) => {
                          setEduFiles(files);
                          if (files.length > 0) handleUploadDoc('EDUCATION_PROOF', files);
                        }}
                        files={eduFiles}
                        allowedFormats={['JPG', 'PNG', 'PDF']}
                        multiple={false}
                        disabled={loading}
                        className="border border-border rounded-lg p-2 bg-muted/50"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Other Tasks & Status */}
              <div className="space-y-6">
                {/* BGV Status Tracker */}
                <Card className="border border-purple-100 rounded-lg shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="w-full">
                        <h4 className="text-[12px] font-medium text-foreground">Background Verification</h4>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">Our compliance team is auditing your uploaded profiles.</p>
                        
                        {candidate?.status === 'BGV_CLEARED' ? (
                          <div className="space-y-2">
                            <div className="w-full bg-emerald-100 rounded-full h-2">
                              <div className="bg-emerald-600 h-2 rounded-full w-full"></div>
                            </div>
                            <p className="text-xs font-bold text-emerald-600 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Cleared
                            </p>
                          </div>
                        ) : candidate?.status === 'BGV_FAILED' ? (
                          <div className="space-y-2">
                            <div className="w-full bg-red-100 rounded-full h-2">
                              <div className="bg-red-600 h-2 rounded-full w-full"></div>
                            </div>
                            <p className="text-xs font-bold text-red-600 flex items-center">
                              <XCircle className="w-4 h-4 mr-1" /> Failed / Flagged
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-full bg-primary/10 rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full w-[45%]"></div>
                            </div>
                            <p className="text-xs font-bold text-primary">Verification In Progress</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Accept Policies Task */}
                <Card className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 text-primaryrounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-medium text-foreground">Corporate & Privacy Policies</h4>
                        <p className="text-xs text-muted-foreground mt-1">Review and sign corporate code of conduct policies.</p>
                      </div>
                    </div>
                    {policiesAccepted ? (
                      <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 animate-bounce" /> You have signed all corporate policies.
                      </div>
                    ) : (
                      <Button 
                        onClick={handleAcceptPolicies}
                        className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-xs"
                      >
                        Accept & Sign Policies
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Details Task */}
                <Card className="border border-border rounded-lg shadow-sm bg-card overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-medium text-foreground">Bank & Payroll Details</h4>
                        <p className="text-xs text-muted-foreground mt-1">Provide direct deposit details for payroll.</p>
                      </div>
                    </div>
                    {bankSubmitted ? (
                      <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 animate-bounce" /> Bank details received and locked.
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitBankDetails} className="space-y-3">
                        <Input
                          placeholder="Bank Name"
                          value={bankDetails.bank_name}
                          onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                          className="h-10 text-xs rounded-lg bg-muted"
                        />
                        <Input
                          placeholder="Account Number"
                          value={bankDetails.account_number}
                          onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value})}
                          className="h-10 text-xs rounded-lg bg-muted"
                        />
                        <Input
                          placeholder="IFSC Code"
                          value={bankDetails.ifsc_code}
                          onChange={(e) => setBankDetails({...bankDetails, ifsc_code: e.target.value})}
                          className="h-10 text-xs rounded-lg bg-muted"
                        />
                        <Button 
                          type="submit"
                          className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-xs"
                        >
                          Submit Payroll Data
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}

        {/* Candidate Timeline Modal */}
        {showTimeline && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg max-w-lg w-full max-h-[85vh] overflow-hidden shadow-sm flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-border flex justify-between items-center bg-primary/10/50">
                <div>
                  <h3 className="font-bold text-foreground text-lg">Your Application Journey</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time status updates of your onboarding.</p>
                </div>
                <button onClick={() => setShowTimeline(false)} className="rounded-full w-8 h-8 flex items-center justify-center bg-muted hover:bg-gray-200 text-muted-foreground transition-all font-semibold">✕</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {candidate?.history && candidate.history.length > 0 ? (
                  <div className="relative border-l border-primary-100 ml-4 space-y-8 py-2">
                    {candidate.history.map((h: any, i: number) => (
                      <div key={i} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-primary rounded-full border-4 border-white shadow-sm"></div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{h.action.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                          </div>
                          {h.comments && (
                            <p className="text-xs text-gray-600 mt-1 italic">"{h.comments}"</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>Status:</span>
                            <span className="font-semibold text-gray-600">{h.previous_state}</span>
                            <span>➜</span>
                            <span className="font-semibold text-primary">{h.new_state}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No timeline records found.
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-muted/50 flex justify-end">
                <Button onClick={() => setShowTimeline(false)} className="bg-primary hover:bg-primary/95 text-white rounded-lg">
                  Close Timeline
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CandidatePortal;
