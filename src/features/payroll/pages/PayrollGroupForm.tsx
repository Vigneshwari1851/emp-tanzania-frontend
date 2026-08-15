import { useState, useEffect, useRef } from 'react';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';
import { useParams } from 'react-router-dom';
import { Input } from '@/shared/components/ui/payroll-lib/input';
import { Label } from '@/shared/components/ui/payroll-lib/label';
import { Button } from '@/shared/components/ui/payroll-lib/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/payroll-lib/select';
import { toast } from 'sonner';
import { usePayroll } from '../context/PayrollContext';
import { getDepartments } from '@/features/organization/services/departments';
import { getRoles } from '@/features/rbac/services/roles';

// Mock/Local helpers since we need organization context
const getLocations = async () => {
    const { getOrganizations } = await import('@/features/organization/services/organizations');
    const orgs = await getOrganizations();
    const normalizedOrgs = Array.isArray(orgs) ? orgs : (orgs ? [orgs] : []);
    const locations: any[] = [];
    normalizedOrgs.forEach((org: any) => {
        const branches = org.branches || org.branch || [];
        if (Array.isArray(branches)) {
            branches.forEach((b: any) => {
                locations.push({ id: b.id.toString(), name: b.branch_name || b.location_name });
            });
        }
    });
    return locations;
};

export default function PayrollGroupForm() {
    const navigate = useOrgNavigate();
    const { id } = useParams();
    const { addGroup, updateGroup, salaryStructures, categories, groups } = usePayroll();

    const [form, setForm] = useState({
        name: '',
        roleId: 'all',
        deptId: 'all',
        locationId: 'all',
        gender: 'all',
        employmentType: 'all',
        salaryStructure: '',
        paymentCategory: '',
    });

    const [options, setOptions] = useState({
        roles: [] as any[],
        departments: [] as any[],
        locations: [] as any[]
    });

    const allRolesRef = useRef<any[]>([]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [r, d, l] = await Promise.all([getRoles(), getDepartments(), getLocations()]);
                allRolesRef.current = r || [];
                const uniqueRolesList = (r || []).filter((role: any, idx: number, self: any[]) => {
                    const name = (role.role_name || role.name || '').toLowerCase().trim();
                    return self.findIndex(x => (x.role_name || x.name || '').toLowerCase().trim() === name) === idx;
                });
                setOptions({ roles: uniqueRolesList, departments: d || [], locations: l || [] });
            } catch (err) {
                console.error("Failed to load options", err);
            }
        };
        loadOptions();
    }, []);

    useEffect(() => {
        if (id && options.roles.length > 0) { // Wait for options to load to match names/ids if needed
            const group = groups.find(g => g.id === id);
            if (group) {
                let criteria = { roleId: 'all', deptId: 'all', locationId: 'all', gender: 'all', employmentType: 'all' };
                try {
                    if (typeof group.criteria === 'string' && group.criteria.startsWith('{')) {
                        criteria = { ...criteria, ...JSON.parse(group.criteria) };
                    } else if (typeof group.criteria === 'object') {
                        criteria = { ...criteria, ...group.criteria };
                    }
                } catch (e) { console.error("JSON Parse Error", e); }

                let mappedRoleId = criteria.roleId?.toString() || 'all';
                if (mappedRoleId !== 'all' && !options.roles.some(r => r.id.toString() === mappedRoleId)) {
                    const originalRoleName = allRolesRef.current.find(o => o.id.toString() === mappedRoleId)?.name 
                        || allRolesRef.current.find(o => o.id.toString() === mappedRoleId)?.role_name;
                    if (originalRoleName) {
                        const match = options.roles.find(r => (r.name || r.role_name || '').toLowerCase().trim() === originalRoleName.toLowerCase().trim());
                        if (match) {
                            mappedRoleId = match.id.toString();
                        }
                    }
                }

                setForm({
                    name: group.name,
                    roleId: mappedRoleId,
                    deptId: criteria.deptId?.toString() || 'all',
                    locationId: criteria.locationId?.toString() || 'all',
                    gender: criteria.gender || 'all',
                    employmentType: criteria.employmentType || 'all',
                    salaryStructure: group.structureId || '',
                    paymentCategory: group.paymentCategoryId || ''
                });
            }
        }
    }, [id, groups, options.roles]);

    const handleSubmit = async () => {
        console.log("Submitting form:", form);
        if (!form.name || !form.name.trim()) {
            toast.error('Group name is required');
            return;
        }

        // Duplicate Check
        const isDuplicateToken = groups.some(g => 
            g.name.toLowerCase() === form.name.trim().toLowerCase() && g.id !== id
        );

        if (isDuplicateToken) {
            toast.error(`Payroll Group "${form.name}" already exists.`);
            return;
        }

        try {
            const criteria = {
                roleId: form.roleId,
                deptId: form.deptId,
                locationId: form.locationId,
                gender: form.gender,
                employmentType: form.employmentType
            };

            const data = {
                name: form.name,
                criteria: JSON.stringify(criteria),
                salaryStructureId: form.salaryStructure,
                paymentCategoryId: form.paymentCategory
            };

            console.log("Calling API with data:", { id, data });

            if (id) {
                await updateGroup(id, data);
                toast.success('Payroll group updated');
            } else {
                await addGroup(data);
                toast.success('Payroll group created');
            }
            navigate('/payroll/setup');
        } catch (error: any) {
            console.error("Submit Error:", error);
            toast.error(error.message || 'Failed to save payroll group');
        }
    };

    return (
        <div className="w-full px-6 py-6">
            {/* FULL PAGE CARD */}
            <div className="w-full bg-card border border-border rounded-lg shadow-sm">

                {/* HEADER */}
                <div className="px-6 py-4 border-b bg-muted/50 rounded-t-xl">
                    <h2 className="text-xl font-semibold text-foreground">
                        {id ? 'Edit Payroll Group' : 'Create Payroll Group'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage payroll group details and salary structure assignment
                    </p>
                </div>

                {/* FORM BODY */}
                <div className="p-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Group Name */}
                        <div className="space-y-2">
                            <Label>Group Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g., Mumbai - Engineering"
                            />
                        </div>

                        {/* Dropdowns for Criteria */}
                        <div className="space-y-2">
                            <Label>Target Department</Label>
                            <Select
                                value={form.deptId}
                                onValueChange={(val) => setForm({ ...form, deptId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {options.departments.map((d) => (
                                        <SelectItem key={d.id} value={d.id.toString()}>{d.department_name || d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Role</Label>
                            <Select
                                value={form.roleId}
                                onValueChange={(val) => setForm({ ...form, roleId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    {options.roles.map((r) => (
                                        <SelectItem key={r.id} value={r.id.toString()}>{r.role_name || r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Location / Branch</Label>
                            <Select
                                value={form.locationId}
                                onValueChange={(val) => setForm({ ...form, locationId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Locations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {options.locations.map((l) => (
                                        <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Gender</Label>
                            <Select
                                value={form.gender}
                                onValueChange={(val) => setForm({ ...form, gender: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Genders" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Genders</SelectItem>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Employment Type</Label>
                            <Select
                                value={form.employmentType}
                                onValueChange={(val) => setForm({ ...form, employmentType: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Employment Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Intern">Intern</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Salary Structure */}
                        <div className="space-y-2">
                            <Label>Assigned Salary Structure</Label>
                            <Select
                                value={form.salaryStructure}
                                onValueChange={(val) => setForm({ ...form, salaryStructure: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a salary structure" />
                                </SelectTrigger>
                                <SelectContent>
                                    {salaryStructures.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Payment Category / Cycle */}
                        <div className="space-y-2">
                            <Label>Payment Category / Cycle</Label>
                            <Select
                                value={form.paymentCategory}
                                onValueChange={(val) => setForm({ ...form, paymentCategory: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select pay cycle category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name} ({cat.frequency})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                    </div>

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-3 pt-6 mt-6 border-t font-bold">
                        <Button variant="outline" onClick={() => navigate('/payroll/setup')} className="h-11 px-8">
                            Cancel
                        </Button>
                        <Button className="h-11 px-8" onClick={handleSubmit}>
                            {id ? 'Update Group' : 'Create Group'}
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}
