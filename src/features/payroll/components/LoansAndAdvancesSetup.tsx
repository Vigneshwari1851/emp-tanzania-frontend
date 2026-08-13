import { useCurrency } from "@/shared/hooks/useCurrency";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/payroll-lib/card';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/payroll-lib/table';
import { Badge } from '@/shared/components/ui/payroll-lib/badge';
import { toast } from 'sonner';
import axiosInstance from '@/shared/services/axiosInstance';
import { usePayroll } from '../context/PayrollContext';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export function LoansAndAdvancesSetup() {
  const { currencySymbol, isTanzania, formatCurrency } = useCurrency();
  const { employees } = usePayroll();
  const [loans, setLoans] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [type, setType] = useState('loan');
  const [employeeId, setEmployeeId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [duration, setDuration] = useState('');

  const handlePrincipalChange = (val: string) => {
    setPrincipal(val);
    const p = parseFloat(val);
    const d = parseFloat(duration);
    if (!isNaN(p) && !isNaN(d) && d > 0) {
      setMonthly((p / d).toFixed(2));
    }
  };

  const handleDurationChange = (val: string) => {
    setDuration(val);
    const p = parseFloat(principal);
    const d = parseFloat(val);
    if (!isNaN(p) && !isNaN(d) && d > 0) {
      setMonthly((p / d).toFixed(2));
    }
  };

  const handleMonthlyChange = (val: string) => {
    setMonthly(val);
    const p = parseFloat(principal);
    const m = parseFloat(val);
    if (!isNaN(p) && !isNaN(m) && m > 0) {
      setDuration(Math.ceil(p / m).toString());
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [loanRes, advRes] = await Promise.all([
        axiosInstance.get('/payroll/loans'),
        axiosInstance.get('/payroll/advances')
      ]);
      setLoans(loanRes.data.data || []);
      setAdvances(advRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load loans and advances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = async () => {
    if (!employeeId || !principal || !monthly) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const payload = {
        userDetailId: employeeId,
        principalAmount: principal,
        monthlyRecovery: monthly
      };
      
      if (type === 'loan') {
        await axiosInstance.post('/payroll/loans', payload);
        toast.success('Loan created successfully');
      } else {
        await axiosInstance.post('/payroll/advances', payload);
        toast.success('Advance created successfully');
      }
      
      // Reset
      setEmployeeId('');
      setPrincipal('');
      setMonthly('');
      setDuration('');
      fetchRecords();
    } catch (err) {
      toast.error(`Failed to create ${type}`);
    }
  };

  // The employee id from usePayroll is from user table, so we need to get userDetail id. Wait, let's just use employee.id. 
  // No, employee context provides employee.details.id.
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Issue New Loan or Advance</CardTitle>
          <CardDescription>Assign a new loan or salary advance to an employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="advance">Salary Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.details?.id?.toString() || emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Amount ({currencySymbol})</Label>
              <Input type="number" placeholder="e.g. 10000" value={principal} onChange={(e) => handlePrincipalChange(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Duration (Months)</Label>
              <Input type="number" placeholder="e.g. 5" value={duration} onChange={(e) => handleDurationChange(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Monthly EMI ({currencySymbol})</Label>
              <Input type="number" placeholder="e.g. 2000" value={monthly} onChange={(e) => handleMonthlyChange(e.target.value)} />
            </div>
          </div>
          
          <Button onClick={handleSubmit} className="mt-6 bg-primary hover:bg-primary/95">Issue {type === 'loan' ? 'Loan' : 'Advance'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Loans & Advances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[800px] border-collapse">
            <TableHeader className="bg-muted border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Amount</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Paid Amount</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly EMI</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l: any) => (
                <TableRow key={`loan-${l.id}`}>
                  <TableCell className="font-medium">{l.userDetail?.first_name} {l.userDetail?.last_name}</TableCell>
                  <TableCell><Badge>Loan</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={l.reason}>{l.reason || '-'}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{l.principalAmount}</TableCell>
                  <TableCell className="text-right text-emerald-600">{currencySymbol}{l.principalAmount - l.outstandingBalance}</TableCell>
                  <TableCell className="text-right text-red-600 font-bold">{currencySymbol}{l.outstandingBalance}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{l.monthlyRecovery}/mo</TableCell>
                  <TableCell className="text-center">
                    {l.status === 'PENDING' ? <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge> : <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-2" size="sm" onClick={async () => {
                          try {
                            await axiosInstance.patch(`/payroll/loans/${l.id}/approve`);
                            toast.success('Loan approved');
                            fetchRecords();
                          } catch (err) { toast.error('Failed to approve loan'); }
                        }}><CheckCircle2 className="size-4" /></Button>
                        <Button variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50 px-2" size="sm" onClick={async () => {
                          try {
                            await axiosInstance.patch(`/payroll/loans/${l.id}/reject`, { reason: 'Rejected by Admin' });
                            toast.success('Loan rejected');
                            fetchRecords();
                          } catch (err) { toast.error('Failed to reject loan'); }
                        }}><XCircle className="size-4" /></Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={async () => {
                        if (confirm('Are you sure you want to mark this loan as fully settled?')) {
                          try {
                            await axiosInstance.patch(`/payroll/loans/${l.id}/settle`);
                            toast.success('Loan marked as settled');
                            fetchRecords();
                          } catch (err) { toast.error('Failed to settle loan'); }
                        }
                      }}>Mark Settled</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {advances.map((a: any) => (
                <TableRow key={`adv-${a.id}`}>
                  <TableCell className="font-medium">{a.userDetail?.first_name} {a.userDetail?.last_name}</TableCell>
                  <TableCell><Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">Advance</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={a.reason}>{a.reason || '-'}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{a.principalAmount}</TableCell>
                  <TableCell className="text-right text-emerald-600">{currencySymbol}{a.principalAmount - a.outstandingBalance}</TableCell>
                  <TableCell className="text-right text-red-600 font-bold">{currencySymbol}{a.outstandingBalance}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{a.monthlyRecovery}/mo</TableCell>
                  <TableCell className="text-center">
                    {a.status === 'PENDING' ? <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge> : <Badge className="bg-emerald-500 hover:bg-emerald-600">Approved</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-2" size="sm" onClick={async () => {
                          try {
                            await axiosInstance.patch(`/payroll/advances/${a.id}/approve`);
                            toast.success('Advance approved');
                            fetchRecords();
                          } catch (err) { toast.error('Failed to approve advance'); }
                        }}><CheckCircle2 className="size-4" /></Button>
                        <Button variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50 px-2" size="sm" onClick={async () => {
                          try {
                            await axiosInstance.patch(`/payroll/advances/${a.id}/reject`, { reason: 'Rejected by Admin' });
                            toast.success('Advance rejected');
                            fetchRecords();
                          } catch (err) { toast.error('Failed to reject advance'); }
                        }}><XCircle className="size-4" /></Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={async () => {
                        if (confirm('Are you sure you want to mark this advance as fully settled?')) {
                          try {
                            await axiosInstance.patch(`/payroll/advances/${a.id}/settle`);
                            toast.success('Advance marked as settled');
                            fetchRecords();
                          } catch (err) { toast.error('Failed to settle advance'); }
                        }
                      }}>Mark Settled</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && advances.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">No active loans or advances found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
