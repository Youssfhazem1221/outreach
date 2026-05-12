"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  Briefcase,
  Users,
  AlertTriangle,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { CustomSelect } from "./ui/CustomSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { db } from "@/lib/firebaseClient";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Lead, LabelRecord, LeadStatus } from "@/types/lead";

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  customLabels: LabelRecord[];
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  city: "",
  country: "",
  niche: "",
  decisionMaker: "",
  decisionMakerTitle: "",
  pain: "",
  status: "New" as LeadStatus,
  selectedLabelIds: [] as string[],
};

type FormState = typeof EMPTY_FORM;

const inputClass =
  "w-full bg-white/5 border border-white/10 outline-none focus:border-emerald-500 text-sm rounded-xl px-3 py-2.5 transition-colors placeholder:text-white/20";

const labelClass = "text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block";

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Field({ label, icon, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-emerald-500/70">{icon}</span>
          {label}
        </span>
      </label>
      {children}
    </div>
  );
}

export function AddLeadModal({ isOpen, onClose, customLabels }: AddLeadModalProps) {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleLabel = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedLabelIds: prev.selectedLabelIds.includes(id)
        ? prev.selectedLabelIds.filter((l) => l !== id)
        : [...prev.selectedLabelIds, id],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = "Company name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;
    setIsSaving(true);

    // Build label objects from IDs
    const labels: LabelRecord[] = form.selectedLabelIds
      .map((id) => customLabels.find((l) => l.id === id))
      .filter(Boolean) as LabelRecord[];

    const payload: Omit<Lead, "id"> = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      website: form.website.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
      niche: form.niche.trim() || undefined,
      decisionMaker: form.decisionMaker.trim() || undefined,
      decisionMakerTitle: form.decisionMakerTitle.trim() || undefined,
      pain: form.pain.trim() || undefined,
      status: form.status,
      labels,
      source: "manual",
      userId: user.uid,
      userEmail: user.email ?? undefined,
      userName: user.displayName ?? undefined,
      history: [],
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    // Remove undefined fields before writing to Firestore
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    ) as Omit<Lead, "id">;

    try {
      await addDoc(collection(db, "leads"), clean);
      notify(`"${form.name}" added to CRM`);
      setForm({ ...EMPTY_FORM });
      setErrors({});
      onClose();
    } catch (err) {
      console.error("Failed to add lead", err);
      notify("Failed to add lead — please try again", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setForm({ ...EMPTY_FORM });
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-white/8 bg-white/[0.02] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <Plus size={14} className="text-emerald-400" />
                    </span>
                    Add New Lead
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manually inject a lead into the pipeline — all fields editable later.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSaving}
                  className="p-2 hover:bg-white/8 rounded-xl transition-colors text-muted-foreground hover:text-white disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="px-8 py-6 space-y-7">

                  {/* ─── Section: Identity ───────────────────────────────── */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500/60 mb-4 pb-2 border-b border-white/5">
                      Identity
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Company Name — full width */}
                      <div className="col-span-2">
                        <Field label="Company Name *" icon={<Briefcase size={11} />}>
                          <input
                            className={`${inputClass} ${errors.name ? "border-red-500/60 focus:border-red-500" : ""}`}
                            placeholder="e.g. Acme Digital Agency"
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            autoFocus
                          />
                          {errors.name && (
                            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                              <AlertTriangle size={9} /> {errors.name}
                            </p>
                          )}
                        </Field>
                      </div>

                      {/* Niche */}
                      <Field label="Industry / Niche" icon={<Briefcase size={11} />}>
                        <input
                          className={inputClass}
                          placeholder="e.g. E-commerce"
                          value={form.niche}
                          onChange={(e) => set("niche", e.target.value)}
                        />
                      </Field>

                      {/* Status */}
                      <Field label="Pipeline Status" icon={<CheckCircle2 size={11} />}>
                        <CustomSelect
                          value={form.status}
                          onChange={(val) => set("status", val)}
                          options={[
                            { value: "New", label: "New" },
                            { value: "Contacted", label: "Contacted" },
                            { value: "Replied", label: "Replied" },
                            { value: "Call Booked", label: "Call Booked" },
                            { value: "Closed", label: "Closed" },
                            { value: "Not Interested", label: "Not Interested" },
                          ]}
                          className="w-full"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* ─── Section: Contact ───────────────────────────────── */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500/60 mb-4 pb-2 border-b border-white/5">
                      Contact Details
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Phone" icon={<Phone size={11} />}>
                        <input
                          className={inputClass}
                          placeholder="+1 555 000 0000"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                        />
                      </Field>
                      <Field label="Email" icon={<Mail size={11} />}>
                        <input
                          type="email"
                          className={inputClass}
                          placeholder="hello@company.com"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                        />
                      </Field>
                      <div className="col-span-2">
                        <Field label="Website / Social Link" icon={<Globe size={11} />}>
                          <input
                            className={inputClass}
                            placeholder="https://company.com or instagram.com/handle"
                            value={form.website}
                            onChange={(e) => set("website", e.target.value)}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* ─── Section: Decision Maker ─────────────────────────── */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500/60 mb-4 pb-2 border-b border-white/5">
                      Decision Maker
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Contact Name" icon={<User size={11} />}>
                        <input
                          className={inputClass}
                          placeholder="John Smith"
                          value={form.decisionMaker}
                          onChange={(e) => set("decisionMaker", e.target.value)}
                        />
                      </Field>
                      <Field label="Title / Role" icon={<Users size={11} />}>
                        <input
                          className={inputClass}
                          placeholder="CEO, Marketing Director..."
                          value={form.decisionMakerTitle}
                          onChange={(e) => set("decisionMakerTitle", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* ─── Section: Location ───────────────────────────────── */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500/60 mb-4 pb-2 border-b border-white/5">
                      Location
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Field label="Street Address" icon={<MapPin size={11} />}>
                          <input
                            className={inputClass}
                            placeholder="123 Main St"
                            value={form.address}
                            onChange={(e) => set("address", e.target.value)}
                          />
                        </Field>
                      </div>
                      <Field label="City" icon={<MapPin size={11} />}>
                        <input
                          className={inputClass}
                          placeholder="Dubai"
                          value={form.city}
                          onChange={(e) => set("city", e.target.value)}
                        />
                      </Field>
                      <Field label="Country" icon={<MapPin size={11} />}>
                        <input
                          className={inputClass}
                          placeholder="UAE"
                          value={form.country}
                          onChange={(e) => set("country", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* ─── Section: Intelligence ───────────────────────────── */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500/60 mb-4 pb-2 border-b border-white/5">
                      Intelligence
                    </p>
                    <div className="space-y-4">
                      {/* Pain Point */}
                      <Field label="Identified Pain Point" icon={<AlertTriangle size={11} />}>
                        <textarea
                          className={`${inputClass} h-24 resize-none`}
                          placeholder="Describe what problem they have that you can solve..."
                          value={form.pain}
                          onChange={(e) => set("pain", e.target.value)}
                        />
                      </Field>

                      {/* Labels */}
                      {customLabels.length > 0 && (
                        <div>
                          <label className={labelClass}>Labels</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {customLabels.map((label) => {
                              const active = form.selectedLabelIds.includes(label.id);
                              return (
                                <button
                                  key={label.id}
                                  type="button"
                                  onClick={() => toggleLabel(label.id)}
                                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                                    active
                                      ? "border-transparent shadow-sm"
                                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                                  }`}
                                  style={
                                    active
                                      ? { backgroundColor: `${label.color}25`, color: label.color, borderColor: `${label.color}50` }
                                      : {}
                                  }
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                  />
                                  {label.name}
                                  {active && <CheckCircle2 size={10} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ─── Sticky Footer ───────────────────────────────────── */}
                <div className="sticky bottom-0 px-8 py-5 border-t border-white/8 bg-[#0a0a0a]/95 backdrop-blur-md flex gap-3 shrink-0">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving to CRM...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Add to Pipeline
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
