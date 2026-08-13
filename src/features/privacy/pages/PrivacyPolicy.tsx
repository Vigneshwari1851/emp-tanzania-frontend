import React, { useState } from 'react';
import { Shield, Lock, FileText, Server, Building2, UserCheck, Eye, Globe, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs';

export function PrivacyPolicy() {
  const [activeTab, setActiveTab] = useState('server');

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Privacy & Policies
        </h1>
        <p className="text-muted-foreground text-lg">
          Understand how your data is handled at both the global platform and individual organizational levels.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-muted p-1 rounded-lg">
          <TabsTrigger 
            value="server" 
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
          >
            <Server className="w-4 h-4 mr-2" />
            Platform Policy
          </TabsTrigger>
          <TabsTrigger 
            value="app"
            className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Application Policy
          </TabsTrigger>
        </TabsList>

        {/* SERVER LEVEL POLICY */}
        <TabsContent value="server" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="h-2 w-full bg-gradient-to-r from-primary-500 to-purple-500" />
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-2xl text-primary-900">
                <Server className="h-6 w-6 text-primary-500" />
                Global Platform Data & Privacy
              </CardTitle>
              <CardDescription className="text-base">
                These foundational rules are hardcoded by the software creators and apply universally to ensure strict legal and infrastructural compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-muted/50 space-y-6">
              
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:shadow-sm transition-shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Globe className="w-5 h-5 text-blue-600" /> Regional Compliance & Data Residency
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We respect international data localization laws. The platform guarantees that personal employee data and 
                  financial records are stored physically within the compliant regions required by your jurisdiction 
                  (e.g., GDPR in Europe, DPDP Act in India). Data is never illegally transferred across borders.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:shadow-sm transition-shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Lock className="w-5 h-5 text-primary-500" /> Infrastructure Security
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  All platform data is secured using AES-256 encryption at rest and TLS 1.3 in transit. We perform regular 
                  security audits, penetration testing, and automated backups to ensure your HR data is protected against 
                  external threats and infrastructure failures.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:shadow-sm transition-shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Eye className="w-5 h-5 text-purple-500" /> Zero Third-Party Monetization
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The EmpXP platform acts solely as a data processor. <strong>We will never sell, rent, or monetize your 
                  company's payroll or employee data to advertisers or third parties.</strong> You retain full ownership 
                  of your organization's records at all times.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* APPLICATION LEVEL POLICY */}
        <TabsContent value="app" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="bg-card">
              <CardTitle className="flex items-center gap-2 text-2xl text-emerald-900">
                <Building2 className="h-6 w-6 text-emerald-500" />
                Organizational Application Privacy
              </CardTitle>
              <CardDescription className="text-base">
                These rules ensure that every company using this software has a completely isolated, private workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-muted/50 space-y-6">
              
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:shadow-sm transition-shadow border-l-4 border-l-emerald-500">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Database className="w-5 h-5 text-emerald-600" /> Tenant Data Isolation (Strict Privacy)
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Your organization exists within a secure, invisible "vault". The application architecture guarantees 
                  <strong> strict data isolation between tenants</strong>. Your employees, salary structures, attendance logs, 
                  and company assets are completely walled off and can never be accessed or viewed by any other company 
                  using this platform.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:shadow-sm transition-shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <UserCheck className="w-5 h-5 text-teal-500" /> Internal Confidentiality Agreement
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  As an employee accessing this portal, you agree to adhere to your employer's internal confidentiality 
                  guidelines. Accessing peer profiles, salary distributions, or organizational charts within this system 
                  is strictly for internal business purposes. Sharing screenshots or exporting data outside the company 
                  is strictly prohibited.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm border border-border hover:shadow-sm transition-shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-cyan-600" /> Employer Monitoring & Tracking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  To ensure accurate payroll and operational security, your organization tracks portal usage. This includes 
                  logging login times, tracking IP addresses for attendance verification, and maintaining immutable audit 
                  logs of approvals, leave requests, and asset assignments.
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
