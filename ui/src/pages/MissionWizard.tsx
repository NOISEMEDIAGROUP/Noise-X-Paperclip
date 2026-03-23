import { useState } from "react";
import { useNavigate } from "@/lib/router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { useCompany } from "../context/CompanyContext";
import { missionsApi } from "../api/missions";

export function MissionWizard() {
  const navigate = useNavigate();
  const { selectedCompanyId } = useCompany();
  const [step, setStep] = useState(1); // 1: Goal, 2: Autonomy, 3: Budget, 4: Updates, 5: Review
  
  // Form state - added notificationChannels to track selections
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    objectives: [""], // Initially one objective field
    autonomyLevel: "copilot", // Default value
    budgetCapUsd: 0, // In USD cents
    digestSchedule: "daily",
    expiresAt: "", // ISO date string
    notificationChannels: ["email", "webpush"], // Default notifications
  });
  
  // Handle step navigation
  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Handle form changes
  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const updated = [...formData.objectives];
    updated[index] = value;
    setFormData(prev => ({ ...prev, objectives: updated }));
  };

  const addObjective = () => {
    setFormData(prev => ({ ...prev, objectives: [...prev.objectives, ""] }));
  };

  const removeObjective = (index: number) => {
    const updated = formData.objectives.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, objectives: updated }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedCompanyId) return;

    try {
      // Remove the placeholder empty objective before submitting
      const objectives = formData.objectives.filter(obj => obj.trim() !== "").map(o => o.trim());
      
      await missionsApi.create(selectedCompanyId, {
        title: formData.title,
        description: formData.description,
        objectives,
        autonomyLevel: formData.autonomyLevel as any,
        budgetCapUsd: formData.budgetCapUsd || undefined,
        digestSchedule: formData.digestSchedule as any,
        expiresAt: formData.expiresAt || undefined,
      });
      
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to create mission:", err);
      // Show error to user
    }
  };

  if (!selectedCompanyId) {
    return <div>No company selected</div>;
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Start a Mission</h1>
        <p className="text-muted-foreground">
          Give your agents a clear goal to achieve.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span 
              key={i} 
              className={`px-2 py-1 rounded-full ${step === i ? 'bg-primary text-primary-foreground' : 'border'}`}
            >
              {i}
            </span>
          ))}
        </div>
        <div className="h-2 bg-accent rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${(step - 1) * 25}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-8">
        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">What's the goal?</h2>
            
            <div>
              <Label htmlFor="title">Mission Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Boost customer retention by 20%"
                autoFocus
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the mission in more detail..."
              />
            </div>
            
            <div>
              <Label>Objectives</Label>
              <div className="space-y-2 mt-2">
                {formData.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={objective}
                      onChange={(e) => handleObjectiveChange(index, e.target.value)}
                      placeholder={`Objective ${index + 1}`}
                    />
                    {formData.objectives.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeObjective(index)}
                      >
                        <span className="font-bold text-destructive">−</span>
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={addObjective}
                >
                  + Add another objective
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Autonomy Level */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">How autonomous should agents work?</h2>
            
            <div className="space-y-4">
              {[
                { value: "assisted", label: "Assisted", description: "I approve deploys + posts" },
                { value: "copilot", label: "Copilot", description: "(Recommended) I only approve prod deploys",  recommended: true },
                { value: "autopilot", label: "Autopilot", description: "Budget cap is my only limit" }
              ].map((level) => (
                <div
                  key={level.value}
                  onClick={() => handleInputChange("autonomyLevel", level.value)}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    formData.autonomyLevel === level.value
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-accent"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="radio"
                      checked={formData.autonomyLevel === level.value}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{level.label}</span>
                        {level.recommended && (
                          <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Set monthly budget</h2>
            
            {!formData?.budgetCapUsd ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleInputChange("budgetCapUsd", 20)}
                    className="border border-input rounded-lg p-4 text-left hover:bg-accent hover:border-accent"
                  >
                    <div className="text-2xl font-bold">$20</div>
                    <div className="text-sm text-muted-foreground">for this mission</div>
                  </button>
                
                  <button
                    onClick={() => handleInputChange("budgetCapUsd", 50)}
                    className="border border-input rounded-lg p-4 text-left hover:bg-accent hover:border-accent"
                  >
                    <div className="text-2xl font-bold">$50</div>
                    <div className="text-sm text-muted-foreground">for this mission</div>
                  </button>
                  
                  <button
                    onClick={() => handleInputChange("budgetCapUsd", 100)}
                    className="border border-input rounded-lg p-4 text-left hover:bg-accent hover:border-accent"
                  >
                    <div className="text-2xl font-bold">$100</div>
                    <div className="text-sm text-muted-foreground">for this mission</div>
                  </button>
                  
                  <button
                    onClick={() => handleInputChange("budgetCapUsd", 0)} // For unlimited
                    className="border border-input rounded-lg p-4 text-left hover:bg-accent hover:border-accent"
                  >
                    <div className="text-2xl font-bold">No Cap</div>
                    <div className="text-sm text-muted-foreground">for this mission</div>
                  </button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <Input
                    type="number"
                    value={formData.budgetCapUsd}
                    onChange={(e) => handleInputChange("budgetCapUsd", e.target.value ? parseFloat(e.target.value) : 0)}
                    placeholder="Enter custom amount"
                    className="pl-8"
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  The monthly budget determines maximum spending for this mission.
                </div>
              </>
            ) : (
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <Input
                    type="number"
                    value={formData.budgetCapUsd}
                    onChange={(e) => handleInputChange("budgetCapUsd", e.target.value ? parseFloat(e.target.value) : 0)}
                    className="pl-8"
                  />
                </div>

                <div className="flex items-center py-4 mt-4 space-x-20">
                  <Label>Remove budget cap</Label>
                  <input
                    type="checkbox"
                    checked={!formData.budgetCapUsd || formData.budgetCapUsd === 0}
                    onChange={(e) => handleInputChange("budgetCapUsd", e.target.checked ? 0 : 20)}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Notification Preferences */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Notifications</h2>
            <p className="text-muted-foreground">
              How do you want to get updates about your mission?
            </p>
            
            <div>
              <Label>Connect Channels</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Telegram</div>
                      <p className="text-sm text-muted-foreground">Get notifications on messenger</p>
                    </div>
                    <input 
                      type="checkbox" 
                      id="telegram" 
                      checked={formData.notificationChannels.includes('telegram')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, notificationChannels: [...formData.notificationChannels, 'telegram']});
                        } else {
                          setFormData({
                            ...formData, 
                            notificationChannels: formData.notificationChannels.filter(c => c !== 'telegram')
                          });
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email</div>
                      <p className="text-sm text-muted-foreground">Get summaries via email</p>
                    </div>
                    <input 
                      type="checkbox" 
                      id="email" 
                      defaultChecked
                      checked={formData.notificationChannels.includes('email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, notificationChannels: [...formData.notificationChannels, 'email']});
                        } else {
                          setFormData({
                            ...formData, 
                            notificationChannels: formData.notificationChannels.filter(c => c !== 'email')
                          });
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Slack</div>
                      <p className="text-sm text-muted-foreground">Get summaries in Slack</p>
                    </div>
                    <input 
                      type="checkbox" 
                      id="slack"
                      checked={formData.notificationChannels.includes('slack')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, notificationChannels: [...formData.notificationChannels, 'slack']});
                        } else {
                          setFormData({
                            ...formData, 
                            notificationChannels: formData.notificationChannels.filter(c => c !== 'slack')
                          });
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Web Push</div>
                      <p className="text-sm text-muted-foreground">Get in-app notifications</p>
                    </div>
                    <input 
                      type="checkbox" 
                      id="webpush"
                      defaultChecked
                      checked={formData.notificationChannels.includes('webpush')}  
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, notificationChannels: [...formData.notificationChannels, 'webpush']});
                        } else {
                          setFormData({
                            ...formData, 
                            notificationChannels: formData.notificationChannels.filter(c => c !== 'webpush')
                          });
                        }
                      }}
                      className="h-4 w-4"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Update Frequency</Label>
              <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { value: "realtime", label: "Real-time" },
                  { value: "hourly", label: "Hourly" },
                  { value: "daily", label: "Daily", recommended: true },
                  { value: "weekly", label: "Weekly" }
                ].map((freq) => (
                  <button
                    key={freq.value}
                    onClick={() => handleInputChange("digestSchedule", freq.value)}
                    className={`p-3 border rounded-lg ${
                      formData.digestSchedule === freq.value
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{freq.label}</span>
                      {freq.recommended && (
                        <span className="text-xs bg-success text-success-foreground px-2 py-0.5 rounded-full h-fit">
                          Recommended
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review and Launch */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review & Launch</h2>
            
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-medium text-muted-foreground">Mission</h3>
                <p className="text-xl font-semibold">{formData.title}</p>
              </div>
              
              {formData.description && (
                <div>
                  <h3 className="font-medium text-muted-foreground">Description</h3>
                  <p>{formData.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-muted-foreground">Objectives</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {formData.objectives.filter(Boolean).map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-muted-foreground">Parameters</h3>
                  <div>Mode: <span className="capitalize">{formData.autonomyLevel}</span></div>
                  <div>Budget: ${formData.budgetCapUsd || "Unlimited"}</div>
                  <div>Schedule: <span className="capitalize">{formData.digestSchedule}</span></div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              After launching, agents will work toward your objectives within the budget constraints.
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
        ) : (
          <div></div> /* Empty div for spacing */
        )}
        
        {step < 5 ? (
          <Button onClick={nextStep}>Continue</Button>
        ) : (
          <Button onClick={handleSubmit}>Launch Mission</Button>
        )}
      </div>
    </div>
  );
}