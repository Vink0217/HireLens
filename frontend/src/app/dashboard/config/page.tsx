"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher, updateConfig, rescanConfig } from "@/lib/api";
import { Settings, Plus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface ConfigField {
  name: string;
  type: string;
  description: string;
}

const DEFAULT_VISIBLE_FIELDS = 3;
const RECOMMENDED_MAX_FIELDS = 12;

const normalizeField = (field: Partial<ConfigField>): ConfigField => ({
  name: typeof field.name === "string" ? field.name : "",
  type: typeof field.type === "string" ? field.type : "string",
  description: typeof field.description === "string" ? field.description : "",
});

interface ExtractionConfig {
  id: string;
  name: string;
  fields: string; // JSON string from DB
  is_default: boolean;
}

export default function ExtractionConfigView() {
  const { data: configs, mutate } = useSWR<ExtractionConfig[]>("/configs", fetcher);
  
  const [activeConfigId, setActiveConfigId] = useState<string>("");
  const [configName, setConfigName] = useState("");
  const [fields, setFields] = useState<ConfigField[]>([]);
  const [showAllFields, setShowAllFields] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);
  const [rescanMessage, setRescanMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  // Load the default config into editor state when SWR finishes
  useEffect(() => {
    if (configs && configs.length > 0 && !activeConfigId) {
      const defaultConfig = configs[0];
      setActiveConfigId(defaultConfig.id);
      setConfigName(defaultConfig.name);
      try {
        const parsed = typeof defaultConfig.fields === 'string' ? JSON.parse(defaultConfig.fields) : defaultConfig.fields;
        setFields(Array.isArray(parsed) ? parsed.map((item) => normalizeField(item)) : []);
        setShowAllFields(false);
      } catch (e) {
        setFields([]);
      }
    }
  }, [configs, activeConfigId]);

  const handleAddField = () => {
    setFields([...fields, { name: "", type: "string", description: "" }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof ConfigField, value: string) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!activeConfigId) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updateConfig(activeConfigId, configName, fields);
      setSaveMessage({ text: "Configuration saved successfully!", type: 'success' });
      mutate();
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage({ text: "Failed to save configuration.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRescan = async () => {
    if (!activeConfigId) return;
    setIsRescanning(true);
    setRescanMessage(null);
    try {
      await rescanConfig(activeConfigId);
      setRescanMessage({ text: "Retroactive rescan started. Existing resumes are now being re-evaluated in the background.", type: 'success' });
    } catch (error) {
      console.error(error);
      setRescanMessage({ text: "Could not start retroactive rescan. Please try again.", type: 'error' });
    } finally {
      setIsRescanning(false);
    }
  };

  // Prevent UI flashing before SWR loads
  if (!configs) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 size={32} className="animate-spin text-brand-accent" />
      </div>
    );
  }

  const visibleFields = showAllFields ? fields : fields.slice(0, DEFAULT_VISIBLE_FIELDS);

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12 max-w-5xl mx-auto">
      <header className="border-b border-brand-border/30 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display text-brand-text mb-1 tracking-wide flex items-center gap-3">
            <Settings size={28} className="text-brand-accent" />
            Extraction Configuration
          </h1>
          <p className="text-sm text-brand-text-muted">Define the exact JSON schema Gemini uses to parse and extract data from uploaded resumes.</p>
        </div>
        <button 
          onClick={handleRescan}
          disabled={isRescanning}
          className="px-4 py-2 border border-brand-accent text-brand-accent rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-accent/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRescanning ? "animate-spin" : ""} />
          {isRescanning ? "Initiating..." : "Retroactive Rescan"}
        </button>
      </header>

      <p className="text-xs text-brand-text-muted -mt-5">
        Retroactive rescan reprocesses all existing resumes with the current extraction schema.
      </p>

      {rescanMessage && (
        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg border animate-fade-in ${rescanMessage.type === 'success' ? 'text-brand-success border-brand-success/40 bg-brand-success/10' : 'text-brand-danger border-brand-danger/40 bg-brand-danger/10'}`}>
          {rescanMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {rescanMessage.text}
        </div>
      )}

      <div className="bg-brand-bg-raised border border-brand-border/50 rounded-xl overflow-hidden shadow-lg">
        <div className="px-8 py-6 border-b border-brand-border/30 bg-brand-surface/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">Preset Name</label>
              <input 
                type="text" 
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="w-full sm:w-80 px-4 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text focus:outline-none focus:border-brand-accent transition-all text-lg font-medium"
              />
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-accent text-brand-bg font-bold rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(212,234,99,0.25)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed h-fit"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? "Saving..." : "Save Schema"}
            </button>
          </div>
          
          {saveMessage && (
            <div className={`flex items-center gap-2 text-sm font-medium mt-2 animate-fade-in ${saveMessage.type === 'success' ? 'text-brand-success' : 'text-brand-danger'}`}>
              {saveMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {saveMessage.text}
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
              Schema Fields
              <span className="text-xs font-medium bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-full">
                {fields.length} Active
              </span>
            </h3>
            <button 
              onClick={handleAddField}
              className="text-sm font-bold text-brand-accent hover:text-[#E4F492] transition-colors flex items-center gap-1"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>

          {fields.length > RECOMMENDED_MAX_FIELDS && (
            <p className="text-xs text-brand-accent mb-4">
              Recommended maximum is around {RECOMMENDED_MAX_FIELDS} fields for clean prompts and better extraction accuracy.
            </p>
          )}

          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-brand-surface/50 rounded-t-lg border-b border-brand-border/50 text-xs font-bold text-brand-text-muted uppercase tracking-wider">
            <div className="col-span-3">Field Key Name</div>
            <div className="col-span-2">Data Type</div>
            <div className="col-span-6">LLM Extraction Instruction (The Prompt)</div>
            <div className="col-span-1 text-right">Delete</div>
          </div>

          <div className="flex flex-col divide-y divide-brand-border/30 border-x border-b border-brand-border/30 rounded-b-lg">
            {visibleFields.map((field, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-4 py-4 items-center group hover:bg-brand-surface/20 transition-colors">
                
                <div className="col-span-3">
                  <input 
                    type="text" 
                    value={field.name ?? ""}
                    placeholder="e.g. total_years_experience"
                    onChange={(e) => handleFieldChange(index, "name", e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-all font-mono"
                  />
                </div>
                
                <div className="col-span-2">
                  <select 
                    value={field.type ?? "string"}
                    onChange={(e) => handleFieldChange(index, "type", e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-all cursor-pointer font-mono"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="list">list (array)</option>
                  </select>
                </div>
                
                <div className="col-span-6">
                  <input 
                    type="text" 
                    value={field.description ?? ""}
                    placeholder="e.g. Calculate the total years of relevant work experience..."
                    onChange={(e) => handleFieldChange(index, "description", e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-all"
                  />
                </div>
                
                <div className="col-span-1 flex justify-end">
                  <button 
                    onClick={() => handleRemoveField(index)}
                    className="p-2 text-brand-text-muted hover:text-brand-danger bg-brand-bg rounded-lg hover:bg-brand-danger/10 transition-colors border border-brand-border/50"
                    title="Remove Field"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
              </div>
            ))}
            
            {fields.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Settings size={32} className="text-brand-text-muted/30 mb-3" />
                <p className="text-brand-text-muted font-medium">No fields defined.</p>
                <p className="text-xs text-brand-text-muted/60 mt-1">Gemini will not extract any structured data.</p>
                <button onClick={handleAddField} className="mt-4 px-4 py-2 border border-brand-accent text-brand-accent text-sm font-bold rounded-lg hover:bg-brand-accent/10 transition-colors">
                  Add First Field
                </button>
              </div>
            )}
          </div>

          {fields.length > DEFAULT_VISIBLE_FIELDS && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllFields((prev) => !prev)}
                className="text-sm font-medium text-brand-accent hover:text-[#F2D070] transition-colors"
              >
                {showAllFields ? "Show Only First 3" : `Show All Fields (${fields.length})`}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
