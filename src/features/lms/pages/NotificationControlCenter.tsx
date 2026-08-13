import React, { useState } from 'react';
import { 
  Mail, Settings, ShieldAlert, Clock, Save, 
  Eye, Edit3, Trash2, Plus, ArrowLeft, 
  Layout, Globe, Smartphone, Bell
} from 'lucide-react';
import { useNotificationSettings, LmsNotificationType } from '../api/lmsNotificationApi';
import { Button } from '@/shared/components/ui/button';
import { useOrgNavigate } from '@/shared/hooks/useOrgNavigate';

export const NotificationControlCenter: React.FC = () => {
  const navigate = useOrgNavigate();
  const { templates, escalationRules } = useNotificationSettings();
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'CADENCE' | 'ESCALATIONS'>('TEMPLATES');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/lms/dashboard')}
            className="w-10 h-10 rounded-lg bg-card border border-border shadow-sm p-0 flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Notification Control Center</h1>
            <p className="text-xs text-muted-foreground font-medium">Configure global LMS communication protocols and escalation logic.</p>
          </div>
        </div>
        <Button className="bg-primary text-white font-black px-6 h-11 rounded-lg text-xs hover:bg-primary/95 shadow-sm shadow-primary-100 flex items-center gap-2">
          <Save size={16} /> Save Changes
        </Button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden p-3">
             {[
               { id: 'TEMPLATES', label: 'Email Templates', icon: <Mail size={16} /> },
               { id: 'CADENCE', label: 'Reminder Cadence', icon: <Clock size={16} /> },
               { id: 'ESCALATIONS', label: 'Escalation Matrix', icon: <ShieldAlert size={16} /> },
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`w-full flex items-center gap-3 p-4 rounded-lg text-xs font-black transition-all ${
                   activeTab === tab.id ? 'bg-primary text-white shadow-sm shadow-primary-100' : 'text-muted-foreground hover:bg-muted'
                 }`}
               >
                 {tab.icon}
                 {tab.label}
               </button>
             ))}
          </div>

          <div className="bg-primary-900 rounded-lg p-6 text-white relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 text-white/10"><Globe size={120} /></div>
             <div className="relative z-10 space-y-4">
                <h4 className="text-[12px] font-medium text-[10px] tracking-widest text-primary-300 uppercase">Global Health</h4>
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="opacity-70">Delivery Success</span>
                      <span>99.9%</span>
                   </div>
                   <div className="w-full h-1 bg-card/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[99.9%]" />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'TEMPLATES' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`p-5 rounded-lg border text-left transition-all ${
                        selectedTemplate.id === tpl.id ? 'bg-card border-primary-200 shadow-sm' : 'bg-card/50 border-border hover:bg-card'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${
                        selectedTemplate.id === tpl.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                         <Mail size={16} />
                      </div>
                      <h4 className="text-[12px] font-medium text-foreground mb-1">{tpl.type}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium truncate">{tpl.subject}</p>
                    </button>
                  ))}
               </div>

               <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-black text-foreground">Template Editor</h3>
                        <p className="text-xs text-muted-foreground font-medium">Use markers like &#123;&#123;user_name&#125;&#125; for dynamic content.</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-black bg-muted text-gray-600"><Eye size={14} className="mr-2"/> Preview</Button>
                        <Button variant="ghost" className="h-9 px-4 rounded-lg text-xs font-black bg-primary/10 text-primary"><Edit3 size={14} className="mr-2"/> Raw HTML</Button>
                     </div>
                  </div>
                  <div className="p-8 space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email Subject</label>
                        <input 
                          type="text" 
                          value={selectedTemplate.subject}
                          className="w-full px-5 py-3 bg-muted border border-border rounded-lg text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:bg-card outline-none transition-all"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Content Body</label>
                        <textarea 
                          rows={8}
                          value={selectedTemplate.body}
                          className="w-full px-5 py-4 bg-muted border border-border rounded-lg text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:bg-card outline-none transition-all resize-none"
                        />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'CADENCE' && (
            <div className="bg-card rounded-[40px] border border-border shadow-sm p-10 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-foreground">Reminder Cadence Configuration</h3>
                  <p className="text-sm text-muted-foreground font-medium">Define automated touchpoints for mandatory compliance training.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6 p-8 bg-muted/50 rounded-lg border border-border">
                     <h4 className="text-[12px] font-medium text-foreground flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-card shadow-sm flex items-center justify-center text-primary"><Bell size={16} /></div>
                        Pre-Deadline Reminders
                     </h4>
                     <div className="space-y-4">
                        {[14, 7, 3, 1].map(days => (
                          <div key={days} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border shadow-sm">
                             <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-foreground">{days} Days Before</span>
                                <span className="text-[10px] font-bold text-muted-foreground">Relative to Due Date</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                   <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Mail size={14} /></div>
                                   <div className="w-8 h-8 rounded-lg bg-muted text-gray-300 flex items-center justify-center"><Smartphone size={14} /></div>
                                </div>
                                <div className="w-10 h-6 bg-primary rounded-full p-1 flex items-center justify-end">
                                   <div className="w-4 h-4 bg-card rounded-full shadow-sm" />
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-6 p-8 bg-rose-50/30 rounded-lg border border-rose-100">
                     <h4 className="text-[12px] font-medium text-foreground flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-card shadow-sm flex items-center justify-center text-rose-600"><ShieldAlert size={16} /></div>
                        Overdue Persistence
                     </h4>
                     <div className="space-y-4">
                        <div className="p-5 bg-card rounded-lg border border-rose-100 shadow-sm space-y-4">
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Repeat Frequency</p>
                           <div className="flex gap-2">
                              {['Daily', 'Every 3 Days', 'Weekly'].map(freq => (
                                <button key={freq} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all ${
                                  freq === 'Every 3 Days' ? 'bg-rose-600 text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-primary/95'
                                }`}>{freq}</button>
                              ))}
                           </div>
                        </div>
                        <div className="p-5 bg-card rounded-lg border border-rose-100 shadow-sm flex items-center justify-between">
                           <div className="space-y-1">
                              <p className="text-xs font-black text-foreground">Stop at Escalation</p>
                              <p className="text-[10px] text-muted-foreground font-medium">Halt reminders if escalated to HR</p>
                           </div>
                           <div className="w-10 h-6 bg-gray-200 rounded-full p-1 flex items-center justify-start">
                              <div className="w-4 h-4 bg-card rounded-full shadow-sm" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'ESCALATIONS' && (
            <div className="bg-card rounded-[40px] border border-border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
               <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-primary-950 text-white">
                  <div>
                     <h3 className="text-2xl font-black">Escalation Matrix</h3>
                     <p className="text-sm text-primary-300 font-medium">Define automated enforcement protocols for non-compliant users.</p>
                  </div>
                  <Button className="bg-card text-primary-950 font-black px-6 h-11 rounded-lg text-xs hover:bg-primary/10">
                     <Plus size={16} className="mr-2" /> Add Rule
                  </Button>
               </div>
               
               <div className="p-10 space-y-6">
                  {escalationRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-6 p-6 rounded-lg border border-border hover:border-primary-100 transition-all group">
                       <div className="w-14 h-14 rounded-lg bg-muted flex flex-col items-center justify-center border border-gray-50 group-hover:bg-primary/10 group-hover:border-primary-100 transition-colors">
                          <span className="text-xl font-black text-foreground group-hover:text-white">{rule.daysOverdue}</span>
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Days</span>
                       </div>
                       
                       <div className="flex-1 space-y-1">
                          <h4 className="text-[12px] font-medium text-foreground">Level {i + 1} Compliance Breach</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">Auto-notify <span className="text-primary font-bold">{rule.recipientRole}</span> with high-urgency enforcement alert.</p>
                       </div>

                       <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                            rule.urgency === 'CRITICAL' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            rule.urgency === 'HIGH' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-blue-50 text-primaryborder border-blue-100'
                          }`}>{rule.urgency}</span>
                          
                          <div className="flex items-center gap-2">
                             <Button variant="ghost" className="h-10 w-10 p-0 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10"><Edit3 size={16}/></Button>
                             <Button variant="ghost" className="h-10 w-10 p-0 rounded-lg bg-muted text-muted-foreground hover:text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></Button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

