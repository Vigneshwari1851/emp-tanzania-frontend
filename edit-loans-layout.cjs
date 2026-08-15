const fs = require('fs');
const path = require('path');

function normalize(str) {
    return str.replace(/\r\n/g, '\n');
}

const setupPath = path.resolve('C:/Users/pvign/OneDrive/Desktop/Nexia Digital/socedge-tech/new/new/emp-tanzania-frontend/src/features/loans-advances/pages/LoansAdvancesSetup.tsx');
let setupContent = normalize(fs.readFileSync(setupPath, 'utf8'));

// Replace form header buttons mapping
const targetHeader = `                        <div className="flex justify-between items-center border-b border-border pb-4">
                            <div>
                                <h3 className="font-extrabold text-lg text-foreground">Loan & Advance Module Settings</h3>
                                <p className="text-xs text-muted-foreground">Configure request prefix, maximum tenure limits, and default interest rate configurations</p>
                            </div>
                            {!isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border transition-all cursor-pointer shadow-sm"
                                >
                                    <Edit className="w-3.5 h-3.5 text-primary" />
                                    Edit Settings
                                </button>
                            )}
                        </div>`;

const replacementHeader = `                        <div className="flex justify-between items-center border-b border-border pb-4">
                            <div>
                                <h3 className="font-extrabold text-lg text-foreground">Loan & Advance Module Settings</h3>
                                <p className="text-xs text-muted-foreground">Configure request prefix, maximum tenure limits, and default interest rate configurations</p>
                            </div>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border transition-all cursor-pointer shadow-sm"
                                >
                                    <Edit className="w-3.5 h-3.5 text-primary" />
                                    Edit Settings
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            fetchSettings();
                                        }}
                                        className="px-3.5 py-2 border border-border hover:bg-muted text-foreground text-xs font-bold rounded-lg transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                                    >
                                        Save Settings
                                    </button>
                                </div>
                            )}
                        </div>`;

if (setupContent.includes(targetHeader)) {
    setupContent = setupContent.replace(targetHeader, replacementHeader);
    console.log('Form header buttons layout updated.');
}

// Remove footer action buttons completely
const targetFooter = `                        {isEditing && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        fetchSettings();
                                    }}
                                    className="px-4 py-2 border border-border hover:bg-muted text-foreground font-semibold rounded-lg text-sm transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg text-sm transition-all shadow-sm cursor-pointer"
                                >
                                    Save Settings
                                </button>
                            </div>
                        )}`;

if (setupContent.includes(targetFooter)) {
    setupContent = setupContent.replace(targetFooter, '');
    console.log('Form footer action buttons removed.');
}

fs.writeFileSync(setupPath, setupContent, 'utf8');
console.log('LoansAdvancesSetup.tsx header action updates completed.');
