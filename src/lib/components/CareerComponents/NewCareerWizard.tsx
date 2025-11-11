"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "@/lib/context/AppContext";
import philippineLocations from "../../../../public/philippines-locations.json";
import CustomDropdown from "./CustomDropdown";
import RichTextEditor from "./RichTextEditor";
import InterviewQuestionGeneratorV2 from "./InterviewQuestionGeneratorV2";
import axios from "axios";
import { candidateActionToast, errorToast, guid } from "@/lib/Utils";

type TeamMember = { email: string; role: "Job Owner" | "Contributor" | "Reviewer" };

const workSetupOptions = [
    { name: "Fully Remote" },
    { name: "Onsite" },
    { name: "Hybrid" },
];

const employmentTypeOptions = [
    { name: "Full-Time" },
    { name: "Part-Time" },
    { name: "Contract" },
];

const screeningOptions = [
    { name: "Good Fit and Above" },
    { name: "Only Strong Fit" },
    { name: "No Automatic Promotion" },
];

// AI Interview Setup option scaffolds
const aiLanguageOptions = [
    { name: 'English' },
    { name: 'Tagalog' },
    { name: 'Spanish' },
];
const aiVoiceOptions = [
    { name: 'Neutral Female' },
    { name: 'Neutral Male' },
    { name: 'Energetic Female' },
];
const evaluationFocusPresets = ['Communication', 'Technical Depth', 'Problem Solving', 'Culture Fit'];

const preScreeningOptions = [
    { icon: '/icons/user2.svg', name: 'Short Answer' },
    { icon: '/icons/longans.svg', name: 'Long Answer' },
    { icon: '/icons/circledrop.svg', name: 'Dropdown' },
    { icon: '/icons/user2.svg', name: 'Checkboxes' },
    { icon: '/icons/number.svg', name: 'Range' }
];

const defaultQuestions = [
    { id: 1, category: "CV Validation / Experience", questionCountToAsk: null, questions: [] },
    { id: 2, category: "Technical", questionCountToAsk: null, questions: [] },
    { id: 3, category: "Behavioral", questionCountToAsk: null, questions: [] },
    { id: 4, category: "Analytical", questionCountToAsk: null, questions: [] },
    { id: 5, category: "Others", questionCountToAsk: null, questions: [] },
];

type PreScreenOption = { id: string; text: string };
type PreScreenQuestion = {
    id: string;
    prompt: string;
    answerType: "Short Answer" | "Long Answer" | "Dropdown" | "Checkboxes" | "Range";
    options?: PreScreenOption[];
    currency?: string; // e.g., 'PHP', 'USD' for Range types
};

export default function NewCareerWizard() {
    const { user, orgID } = useAppContext();
    const DRAFT_KEY = 'new_career_wizard_draft_v1';
    const StepIcon = ({ active }: { active: boolean }) => (
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M8.33333 0C3.74167 0 0 3.74167 0 8.33333C0 12.925 3.74167 16.6667 8.33333 16.6667C12.925 16.6667 16.6667 12.925 16.6667 8.33333C16.6667 3.74167 12.925 0 8.33333 0ZM8.33333 15C4.65833 15 1.66667 12.0083 1.66667 8.33333C1.66667 4.65833 4.65833 1.66667 8.33333 1.66667C12.0083 1.66667 15 4.65833 15 8.33333C15 12.0083 12.0083 15 8.33333 15ZM10.8333 8.33333C10.8333 9.71667 9.71667 10.8333 8.33333 10.8333C6.95 10.8333 5.83333 9.71667 5.83333 8.33333C5.83333 6.95 6.95 5.83333 8.33333 5.83333C9.71667 5.83333 10.8333 6.95 10.8333 8.33333Z"
                fill={active ? "#111827" : "#ADB5BD"}
            />
        </svg>
    );

    // Step control
    const steps = [
        "Career Details & Team Access",
        "CV Review & Pre-screening",
        "AI Interview Setup",
        "Pipeline Stages",
        "Review Career",
    ];
    const [currentStep, setCurrentStep] = useState(0);

    // Form state (Step 1 primary)
    const [jobTitle, setJobTitle] = useState("");
    const [description, setDescription] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [workSetup, setWorkSetup] = useState("");
    const [workSetupRemarks, setWorkSetupRemarks] = useState("");
    const [screeningSetting, setScreeningSetting] = useState("Good Fit and Above");
    const [requireVideo, setRequireVideo] = useState(true);
    const [questions, setQuestions] = useState(defaultQuestions);
    const [preScreeningQuestions, setPreScreeningQuestions] = useState<PreScreenQuestion[]>([]);
    const [secretPrompt, setSecretPrompt] = useState(""); // AI Interview Secret Prompt
    const [cvSecretPrompt, setCvSecretPrompt] = useState("");
    const secretPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const cvSecretPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const [salaryNegotiable, setSalaryNegotiable] = useState(true);
    const [minimumSalary, setMinimumSalary] = useState<string | number>("");
    const [maximumSalary, setMaximumSalary] = useState<string | number>("");
    const [country, setCountry] = useState("Philippines");
    const [province, setProvince] = useState("");
    const [city, setCity] = useState("");
    const [provinceList, setProvinceList] = useState<any[]>([]);
    const [cityList, setCityList] = useState<any[]>([]);
    // AI Interview Setup state (Step 2)
    const [aiLanguage, setAiLanguage] = useState('English');
    const [aiVoice, setAiVoice] = useState('Neutral Female');
    const [interviewDuration, setInterviewDuration] = useState<number | ''>(30); // minutes
    const [aiIntroMessage, setAiIntroMessage] = useState('');
    const [aiEvaluationFocus, setAiEvaluationFocus] = useState<string[]>([]);
    const [aiAdditionalNotes, setAiAdditionalNotes] = useState('');
    const [pipelineStages, setPipelineStages] = useState<any[]>([
        {
            id: guid(),
            title: 'CV Screening',
            core: true,
            icon: 'cv',
            substages: [
                { id: guid(), label: 'Waiting Submission', automated: true },
                { id: guid(), label: 'For Review', automated: false },
            ],
        },
        {
            id: guid(),
            title: 'AI Interview',
            core: true,
            icon: 'ai',
            substages: [
                { id: guid(), label: 'Waiting Interview', automated: true },
                { id: guid(), label: 'For Review', automated: false },
            ],
        },
        {
            id: guid(),
            title: 'Final Human Interview',
            core: true,
            icon: 'human',
            substages: [
                { id: guid(), label: 'Waiting Schedule', automated: true },
                { id: guid(), label: 'Waiting Interview', automated: false },
                { id: guid(), label: 'For Review', automated: false },
            ],
        },
        {
            id: guid(),
            title: 'Job Offer',
            core: true,
            icon: 'offer',
            substages: [
                { id: guid(), label: 'For Final Review', automated: false },
                { id: guid(), label: 'Waiting Offer Acceptance', automated: true },
                { id: guid(), label: 'For Contract Signing', automated: false },
                { id: guid(), label: 'Hired', automated: false },
            ],
        },
    ]);
    const [revOpenDetails, setRevOpenDetails] = useState(true);
    const [revOpenCV, setRevOpenCV] = useState(true);
    const [revOpenAI, setRevOpenAI] = useState(true);
    const [revOpenPipeline, setRevOpenPipeline] = useState(true);

    const toggleFocus = (tag: string) => {
        setAiEvaluationFocus(list => list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
    };

    // Team access (visual only for now)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("Contributor");
    const [rolePickerFor, setRolePickerFor] = useState<string | null>(null);
    const [memberPickerOpen, setMemberPickerOpen] = useState(false);
    const [allOrgMembers, setAllOrgMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");

    // Internal flags
    const [submitting, setSubmitting] = useState(false);
    const [attemptedContinue, setAttemptedContinue] = useState(false);
    const submittedRef = useRef(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [generatingCat, setGeneratingCat] = useState<string | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [careerId, setCareerId] = useState<string | null>(null);

    useEffect(() => {
        // Initialize locations with provinces and full city list (no preselection)
        const provinces = philippineLocations.provinces as any[];
        setProvinceList(provinces);
        // Default: show placeholder for province and city, but allow city dropdown to list all cities when opened
        setProvince("");
        setCityList(philippineLocations.cities as any[]);
        setCity("");
    }, []);

    // Hydrate draft from localStorage if present
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const d = JSON.parse(raw || '{}');
            if (!d) return;
            setJobTitle(d.jobTitle ?? "");
            setDescription(d.description ?? "");
            setEmploymentType(d.employmentType ?? "");
            setWorkSetup(d.workSetup ?? "");
            setWorkSetupRemarks(d.workSetupRemarks ?? "");
            setScreeningSetting(d.screeningSetting ?? 'Good Fit and Above');
            setPreScreeningQuestions(d.preScreeningQuestions ?? []);
            setRequireVideo(!!d.requireVideo);
            setQuestions(d.questions ?? defaultQuestions);
            setSalaryNegotiable(!!d.salaryNegotiable);
            setMinimumSalary(d.minimumSalary ?? "");
            setMaximumSalary(d.maximumSalary ?? "");
            setCountry(d.country ?? 'Philippines');
            setProvince(d.province ?? "");
            setCity(d.location ?? "");
            setAiLanguage(d.aiLanguage ?? 'English');
            setAiVoice(d.aiVoice ?? 'Neutral Female');
            setInterviewDuration(d.interviewDuration ?? 30);
            setAiIntroMessage(d.aiIntroMessage ?? '');
            setAiEvaluationFocus(d.aiEvaluationFocus ?? []);
            setAiAdditionalNotes(d.aiAdditionalNotes ?? '');
            setPipelineStages(d.pipelineStages ?? []);
            setCvSecretPrompt(d.cvSecretPrompt ?? "");
            setSecretPrompt(d.secretPrompt ?? "");
            setCareerId(d.careerId ?? null);
            setHasDraft(true);
            if (typeof d.lastVisitedStep === 'number') {
                setCurrentStep(Math.max(0, Math.min(d.lastVisitedStep, (steps?.length ?? 1) - 1)));
            }
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Add current user as Job Owner by default (once)
        if (user?.email && teamMembers.length === 0) {
            setTeamMembers([{ email: user.email, role: "Job Owner" }]);
        }
    }, [user, teamMembers.length]);

    useEffect(() => {
        // Prefetch all org members for picker (simple fetch, can paginate later)
        const loadMembers = async () => {
            if (!orgID) return;
            try {
                const res = await fetch('/api/fetch-members', { method: 'POST', body: JSON.stringify({ orgID }), headers: { 'Content-Type': 'application/json' } });
                if (res.ok) {
                    const data = await res.json();
                    setAllOrgMembers(data || []);
                }
            } catch (e) { /* silent */ }
        };
        loadMembers();
    }, [orgID]);

    const canProceedStep1 = useMemo(() => {
        return (
            jobTitle.trim().length > 0 &&
            description.trim().length > 0 &&
            employmentType.trim().length > 0 &&
            workSetup.trim().length > 0 &&
            province.trim().length > 0 &&
            city.trim().length > 0
        );
    }, [jobTitle, description, employmentType, workSetup, province, city]);

    // Step 3 (AI Interview Setup) requirement: at least one question per category
    const allCategoriesHaveAtLeastOne = useMemo(() => {
        const nonEmptyTotal = questions.reduce((sum, cat) => {
            const count = (cat.questions || []).filter((q: any) => {
                const t = String(q.text ?? q.prompt ?? '').trim();
                return t.length > 0;
            }).length;
            return sum + count;
        }, 0);
        const remaining = Math.max(0, 5 - nonEmptyTotal);
        return { status: nonEmptyTotal >= 5, remaining };
    }, [questions]);

    // Generic gate for current step
    const canProceedCurrentStep = useMemo(() => {
        if (currentStep === 0) return canProceedStep1;
        if (currentStep === 2) return allCategoriesHaveAtLeastOne.status; // enforce per-category questions before leaving Step 2
        return true; // other steps currently have no gating rules
    }, [currentStep, canProceedStep1, allCategoriesHaveAtLeastOne.status]);

    const isInvalid = (val: string) => attemptedContinue && val.trim().length === 0;

    // Step 1 completeness for stepper icon
    const fieldsFilledCount = useMemo(() => {
        const values = [jobTitle, description, employmentType, workSetup, province, city];
        return values.filter((v) => v && v.trim().length > 0).length;
    }, [jobTitle, description, employmentType, workSetup, province, city]);
    const pageIncomplete = fieldsFilledCount < 6;
    // Show alert icon on the active step if its validation failed after a continue attempt
    const showCurrentAlert = useMemo(() => {
        if (!attemptedContinue) return false;
        if (currentStep === 0) return pageIncomplete;
        if (currentStep === 2) return !allCategoriesHaveAtLeastOne.status;
        return false;
    }, [attemptedContinue, currentStep, pageIncomplete, allCategoriesHaveAtLeastOne.status]);

    const addMember = (email: string, role: TeamMember['role'] = 'Contributor') => {
        if (!email) return;
        if (teamMembers.some((m) => m.email === email)) {
            errorToast("Member already added", 1200);
            return;
        }
        setTeamMembers((prev) => [...prev, { email, role }]);
    };

    const removeMember = (email: string) => {
        setTeamMembers((prev) => prev.filter((m) => m.email !== email));
    };

    const updateMemberRole = (email: string, role: TeamMember["role"]) => {
        setTeamMembers((prev) => prev.map((m) => (m.email === email ? { ...m, role } : m)));
    };

    const getInitials = (text: string) => {
        if (!text) return "";
        const base = text.split("@")[0] || text;
        const parts = base.split(/[._-]/).filter(Boolean);
        const first = parts[0]?.[0] || base[0];
        const second = parts.length > 1 ? parts[1][0] : base[1];
        return (first + (second || "")).toUpperCase();
    };

    const hasJobOwner = useMemo(() => teamMembers.some((m) => m.role === "Job Owner"), [teamMembers]);

    // Persist career only when user explicitly clicks publish/save
    const handleSave = async (status: "inactive" | "active") => {
        if (submittedRef.current) return;
        if (Number(minimumSalary) && Number(maximumSalary) && Number(minimumSalary) > Number(maximumSalary)) {
            errorToast("Minimum salary cannot be greater than maximum salary", 1300);
            return;
        }
        try {
            setSubmitting(true);
            submittedRef.current = true;
            const userInfo = user ? { image: user.image, name: user.name, email: user.email } : undefined;
            const basePayload: any = {
                jobTitle,
                description,
                workSetup,
                workSetupRemarks,
                questions,
                lastEditedBy: userInfo,
                createdBy: userInfo,
                screeningSetting,
                orgID,
                requireVideo,
                cvSecretPrompt: cvSecretPrompt || undefined,
                aiSecretPrompt: secretPrompt || undefined,
                lastVisitedStep: currentStep,
                preScreeningQuestions:
                    preScreeningQuestions.length > 0
                        ? preScreeningQuestions.map((q) => ({
                            id: q.id,
                            prompt: q.prompt,
                            answerType: q.answerType,
                            options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
                        }))
                        : [],
                salaryNegotiable,
                minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
                maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
                country,
                province,
                location: city,
                status,
                employmentType,
                // AI Setup
                aiLanguage,
                aiVoice,
                interviewDuration,
                aiIntroMessage,
                aiEvaluationFocus,
                aiAdditionalNotes,
                // Pipeline
                pipelineStages,
            };
            let res;
            if (careerId) {
                // Update existing draft or publish existing
                res = await axios.post("/api/update-career", { _id: careerId, ...basePayload });
            } else {
                // Create new draft/published
                res = await axios.post("/api/add-career", basePayload);
            }
            if (res && res.status === 200) {
                // Capture ID
                const newId = (res.data && (res.data._id || res.data.id || (res.data.data && (res.data.data._id || res.data.data.id)))) || careerId || null;
                if (newId && newId !== careerId) setCareerId(newId);
                // Persist draft snapshot locally so user can resume last step later
                try {
                    const draft = {
                        jobTitle,
                        description,
                        employmentType,
                        workSetup,
                        workSetupRemarks,
                        screeningSetting,
                        requireVideo,
                        questions,
                        preScreeningQuestions,
                        salaryNegotiable,
                        minimumSalary,
                        maximumSalary,
                        country,
                        province,
                        location: city,
                        aiLanguage,
                        aiVoice,
                        interviewDuration,
                        aiIntroMessage,
                        aiEvaluationFocus,
                        aiAdditionalNotes,
                        pipelineStages,
                        cvSecretPrompt,
                        secretPrompt,
                        careerId: newId || careerId,
                        lastVisitedStep: currentStep,
                        ts: Date.now(),
                    };
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                    setHasDraft(true);
                } catch { /* ignore */ }
                candidateActionToast(
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Career saved</span>
                    </div>,
                    1300,
                    <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>
                );
                if (status === 'active') {
                    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
                    setHasDraft(false);
                }
                setTimeout(() => {
                    window.location.href = "/recruiter-dashboard/careers";
                }, 1300);
            }
        } catch (e) {
            console.error(e);
            errorToast("Failed to save career", 1300);
        } finally {
            setSubmitting(false);
            submittedRef.current = false;
        }
    };

    const getSafeRichHtml = (input: string): string => {
        if (!input) return '';
        const sanitized = sanitizeRichHtml(input);
        if (sanitized && sanitized.trim().length > 0) return sanitized;
        // Fallback 1: decoded, minimally processed HTML (entity decoding only)
        let decoded = '';
        try {
            const ta = document.createElement('textarea');
            ta.innerHTML = String(input);
            decoded = ta.value;
        } catch {
            decoded = String(input)
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }
        if (decoded && decoded.trim().length > 0) return decoded;
        // Fallback 2: plain text
        return stripHtml(input);
    };

    // Only advance to next step; do NOT autosave here
    const handleContinue = async () => {
        // Determine gating for current step
        if (!canProceedCurrentStep) {
            setAttemptedContinue(true);
            return;
        }
        // Move to next step
        setAttemptedContinue(false);
        setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    };

    const normalizeCategory = (h: string) => (h === 'Behavioural' ? 'Behavioral' : h);
    const extractArrayFromLLM = (raw: string): string[] => {
        if (!raw) return [];
        let t = String(raw).trim();
        if (t.startsWith('```')) {
            t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
        }
        const match = t.match(/\[[\s\S]*\]/);
        if (match) {
            try {
                const val = JSON.parse(match[0]);
                if (Array.isArray(val)) return val.map((x) => String(x));
            } catch { }
        }
        try {
            const val = JSON.parse(t);
            if (Array.isArray(val)) return val.map((x) => String(x));
        } catch { }
        return t
            .split('\n')
            .map((s) => s.replace(/^[\-\*\d\.\s\"]+/, '').replace(/[\"]+$/, '').trim())
            .filter(Boolean);
    };
    const stripHtml = (s: string): string => {
        if (!s) return '';
        let t = String(s);
        t = t.replace(/<br\s*\/?>(?=\s|$)/gi, '\n');
        t = t.replace(/<\/p>/gi, '\n\n');
        t = t.replace(/<p[^>]*>/gi, '');
        t = t.replace(/<[^>]+>/g, '');
        return t.trim();
    };
    const sanitizeRichHtml = (input: string): string => {
        if (!input) return '';
        let html = String(input);
        // First decode common HTML entities to real tags/text
        try {
            const ta = document.createElement('textarea');
            ta.innerHTML = html;
            html = ta.value;
        } catch {
            html = html
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }
        // On SSR, avoid DOM APIs and return a stripped fallback to prevent raw HTML showing
        if (typeof window === 'undefined') {
            return stripHtml(html);
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const allowedTags = new Set([
                'div', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
            ]);
            const allowedAttrs: Record<string, Set<string>> = {
                a: new Set(['href', 'title']),
                '*': new Set(['class'])
            };
            const allowedStyleProps = new Set(['text-align', 'font-weight', 'font-style', 'text-decoration']);
            const walk = (node: Node) => {
                if (node.nodeType === 1) {
                    const el = node as HTMLElement;
                    const tag = el.tagName.toLowerCase();
                    if (!allowedTags.has(tag)) {
                        const parent = el.parentNode;
                        if (parent) {
                            while (el.firstChild) parent.insertBefore(el.firstChild, el);
                            parent.removeChild(el);
                        }
                        return;
                    }
                    const attrs = Array.from(el.attributes);
                    for (const attr of attrs) {
                        const name = attr.name.toLowerCase();
                        if (name.startsWith('on')) { el.removeAttribute(attr.name); continue; }
                        if (name === 'style') {
                            // keep only whitelisted style props
                            const style = el.getAttribute('style') || '';
                            const safeParts: string[] = [];
                            style.split(';').forEach((decl) => {
                                const [prop, val] = decl.split(':');
                                if (!prop || !val) return;
                                const p = prop.trim().toLowerCase();
                                if (allowedStyleProps.has(p)) safeParts.push(`${p}: ${val.trim()}`);
                            });
                            if (safeParts.length) el.setAttribute('style', safeParts.join('; ')); else el.removeAttribute('style');
                            continue;
                        }
                        const allowForTag = allowedAttrs[tag] || allowedAttrs['*'];
                        if (allowForTag && allowForTag.has(name)) {
                            if (tag === 'a' && name === 'href') {
                                const v = el.getAttribute('href') || '';
                                if (!/^(https?:|mailto:|tel:)/i.test(v)) el.setAttribute('href', '#');
                            }
                            continue;
                        }
                        // remove non-allowed attrs
                        el.removeAttribute(attr.name);
                    }
                }
                let child = node.firstChild;
                while (child) {
                    const next = child.nextSibling;
                    walk(child);
                    child = next;
                }
            };
            walk(doc.body);
            const sanitized = doc.body.innerHTML;
            return sanitized;
        } catch {
            return '';
        }
    };
    const runGenerate = async (catHeading: string): Promise<string[]> => {
        const catName = normalizeCategory(catHeading);
        const systemPrompt = "You are an expert interviewer for recruiting. Write concise, skill-focused interview questions tailored to the role. Use the category only as a thematic lens. Avoid years-of-experience requirements, generic fluff, or restating the job description. Return only a JSON array of strings.";
        const prompt = `Context\n- Role: ${jobTitle || '(no title provided)'}\n- Description: ${description || '(no description provided)'}\n- Theme: ${catName}\n\nInstructions\n- Treat the theme as guidance for the type of skills or behaviors to probe.\n- Do not mention the words \'category\' or \'theme\'.\n- Avoid asking about specific numbers of years of experience.\n- Keep each question under 25 words.\n\nOutput\nReturn exactly 3 tailored interview questions as a JSON array of strings, with no extra text.`;
        const res = await fetch('/api/llm-engine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, prompt })
        });
        const data = await res.json();
        const arr = extractArrayFromLLM(data.result || '');
        return arr;
    };
    const totalAiQuestions = useMemo(() => (
        (questions || []).reduce((sum, cat: any) => sum + ((cat?.questions || []).filter((q: any) => String(q.text ?? q.prompt ?? '').trim().length > 0).length), 0)
    ), [questions]);
    const hasAnyInputForStep = (idx: number): boolean => {
        if (idx === 0) {
            return [jobTitle, description, employmentType, workSetup, province, city].some((v) => String(v || '').trim().length > 0);
        }
        if (idx === 1) {
            const hasPrompt = String(cvSecretPrompt || '').trim().length > 0;
            const hasPre = (preScreeningQuestions || []).length > 0;
            return hasPrompt || hasPre;
        }
        if (idx === 2) {
            return totalAiQuestions > 0;
        }
        if (idx === 3) {
            return (pipelineStages || []).length > 0;
        }
        return false;
    };
    const getStepProgress = (idx: number): 0 | 0.5 | 1 => {
        if (idx === 0) {
            const filled = [jobTitle, description, employmentType, workSetup, province, city].filter((v) => String(v || '').trim().length > 0).length;
            if (filled === 0) return 0;
            if (filled >= 6) return 1;
            return 0.5;
        }
        if (idx === 1) {
            const a = String(cvSecretPrompt || '').trim().length > 0 ? 1 : 0;
            const b = (preScreeningQuestions || []).length > 0 ? 1 : 0;
            const filled = a + b;
            if (filled === 0) return 0;
            if (filled >= 2) return 1;
            return 0.5;
        }
        if (idx === 2) {
            if (totalAiQuestions === 0) return 0;
            if (totalAiQuestions >= 5) return 1;
            return 0.5;
        }
        if (idx === 3) {
            return 1;
        }
        return 0;
    };
    const generateCategoryQuestions = async (catHeading: string) => {
        try {
            setGeneratingCat(catHeading);
            const catName = normalizeCategory(catHeading);
            const arr = await runGenerate(catHeading);
            const items = arr.map((s: string) => ({ id: guid(), text: s, prompt: s }));
            setQuestions(list => list.map(c => c.category === catName ? { ...c, questions: [...(c.questions || []), ...items] } : c));
        } finally {
            setGeneratingCat(null);
        }
    };

    const handleGenerateAll = async () => {
        try {
            setGeneratingAll(true);
            const heads = ["CV Validation / Experience", "Technical", "Behavioural", "Analytical", "Others"];
            for (const h of heads) {
                const catName = normalizeCategory(h);
                const arr = await runGenerate(h);
                const items = arr.map((s: string) => ({ id: guid(), text: s, prompt: s }));
                setQuestions(list => list.map(c => c.category === catName ? { ...c, questions: [...(c.questions || []), ...items] } : c));
            }

        } finally {
            setGeneratingAll(false);
        }
    };

    return (
        <div id="new-career-wizard" className="col">
            <style>{`
                .nwz-input::placeholder { font-family: 'Satoshi', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight:500; font-size:16px; color:#717680; }
                .nwz-inline-salary { display:flex; align-items:center; gap:8px; }
                .nwz-salary-wrapper { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                .nwz-salary-box { display:flex; align-items:center; gap:8px; border:1px solid #E9EAEB; border-radius:8px; padding:10px 14px; background:#fff; }
                .nwz-salary-box span.symbol, .nwz-salary-box span.ccy { font-size:16px; color:#717680; font-weight:500; }
                .nwz-salary-box input { border:none; outline:none; width:100%; font-size:16px; color:#181D27; padding:0; box-shadow:none; background:transparent; }
                .nwz-salary-box input::placeholder { font-family:'Satoshi'; font-weight:500; font-size:16px; color:#717680; }
                /* Force invalid input red border and embedded icon regardless of external styles */
                .nwz-input[aria-invalid="true"] { border: 1px solid #F04438 !important; padding-right:44px !important; background-image:url('/icons/alert-circle.svg') !important; background-repeat:no-repeat !important; background-position: calc(100% - 12px) center !important; background-size:16px 16px !important; }
                .nwz-input { border: 1px solid #E9EAEB !important; border-radius: 8px; }
                .nwz-input:focus { border-color: #E9EAEB !important; box-shadow: none !important; }
                .nwz-input[aria-invalid="true"]:focus { border-color: #F04438 !important; box-shadow: none !important; }
                /* Scoped override for Bootstrap-like .form-control (reduce 2px #9c99a4 to 1px #E9EAEB) */
                #new-career-wizard input.form-control:not([aria-invalid="true"]),
                #new-career-wizard textarea.form-control:not([aria-invalid="true"]),
                #new-career-wizard select.form-control:not([aria-invalid="true"]) {
                    border: 1px solid #E9EAEB !important;
                }
                #new-career-wizard input.form-control:focus:not([aria-invalid="true"]),
                #new-career-wizard textarea.form-control:focus:not([aria-invalid="true"]),
                #new-career-wizard select.form-control:focus:not([aria-invalid="true"]) {
                    border-color: #E9EAEB !important;
                    box-shadow: none !important;
                }
                /* Remove borders for inputs inside the Pre-Screening section only */
                #new-career-wizard .pre-screening-block input.form-control,
                #new-career-wizard .pre-screening-block textarea.form-control,
                #new-career-wizard .pre-screening-block select.form-control,
                #new-career-wizard .pre-screening-block .nwz-input {
                    border: none !important;
                    box-shadow: none !important;
                }
                #new-career-wizard .pre-screening-block input.form-control:focus,
                #new-career-wizard .pre-screening-block textarea.form-control:focus,
                #new-career-wizard .pre-screening-block select.form-control:focus {
                    border: none !important;
                    box-shadow: none !important;
                }
            `}</style>
            {/* Header row */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 550, color: "#111827" }}>
                        {hasDraft && (
                            <span style={{ color: "#667085", marginRight: 8 }}>[Draft]</span>
                        )}
                        {jobTitle.trim().length > 0 ? jobTitle : "Add new careers"}
                    </h1>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: 'center' }}>
                    {currentStep > 0 && (
                        <button
                            type="button"
                            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                            style={{ width: 'fit-content', color: '#414651', background: '#fff', border: '1px solid #D5D7DA', padding: '8px 16px', borderRadius: 60, cursor: 'pointer' }}
                        >
                            <i className="la la-arrow-left" style={{ marginRight: 8 }}></i>
                            Back
                        </button>
                    )}
                    {/* moved pipeline block below AI setup */}
                    {false && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 260 }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>Customize pipeline stages</span>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>Create, modify, reorder, and delete stages and sub-stages. Core stages are fixed and cannot be moved.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <button
                                        type="button"
                                        onClick={() => setPipelineStages([
                                            {
                                                id: guid(), title: 'CV Screening', core: true, icon: 'cv',
                                                substages: [
                                                    { id: guid(), label: 'Waiting Submission', automated: true },
                                                    { id: guid(), label: 'For Review', automated: false },
                                                ]
                                            },
                                            {
                                                id: guid(), title: 'AI Interview', core: true, icon: 'ai',
                                                substages: [
                                                    { id: guid(), label: 'Waiting Interview', automated: true },
                                                    { id: guid(), label: 'For Review', automated: false },
                                                ]
                                            },
                                            {
                                                id: guid(), title: 'Final Human Interview', core: true, icon: 'human',
                                                substages: [
                                                    { id: guid(), label: 'Waiting Schedule', automated: true },
                                                    { id: guid(), label: 'Waiting Interview', automated: false },
                                                    { id: guid(), label: 'For Review', automated: false },
                                                ]
                                            },
                                            {
                                                id: guid(), title: 'Job Offer', core: true, icon: 'offer',
                                                substages: [
                                                    { id: guid(), label: 'For Final Review', automated: false },
                                                    { id: guid(), label: 'Waiting Offer Acceptance', automated: true },
                                                    { id: guid(), label: 'For Contract Signing', automated: false },
                                                    { id: guid(), label: 'Hired', automated: false },
                                                ]
                                            },
                                        ])}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111827', border: '1px solid #D5D7DA', padding: '8px 12px', borderRadius: 24, cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        <span>Restore to default</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => console.log('Copy pipeline from existing job')}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111827', border: '1px solid #D5D7DA', padding: '8px 12px', borderRadius: 24, cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        <span>Copy pipeline from existing job</span>
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
                                {pipelineStages.map((stage) => (
                                    <div key={stage.id} style={{ minWidth: 280, background: '#fff', border: '1px dashed #D5D9EB', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12, fontWeight: 600 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#667085', strokeWidth: 1.5 }}>
                                                <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2Z" />
                                                <path d="M17 9V7a5 5 0 0 0-10 0v2" />
                                            </svg>
                                            <span>Core stage, cannot move</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {stage.icon === 'ai' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M12 1v22M5 8h14M7 17h10" />
                                                        </svg>
                                                    )}
                                                    {stage.icon === 'cv' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm9 0v5h5" />
                                                        </svg>
                                                    )}
                                                    {stage.icon === 'human' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 9a7 7 0 0 0-14 0" />
                                                        </svg>
                                                    )}
                                                    {stage.icon === 'offer' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M3 7h18M7 7v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>{stage.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.6 }}>
                                                    <path d="M12 5.5v.01M12 12v.01M12 18.5v.01" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Substages</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {stage.substages.map((ss: any) => (
                                                <div key={ss.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #EAECF5', borderRadius: 22, padding: '10px 12px', background: '#fff' }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{ss.label}</span>
                                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                                                        {ss.automated ? (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                                                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.8 }}>
                                                                <path d="M9 18l6-6-6-6" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div style={{ minWidth: 80, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPipelineStages(list => [...list, { id: guid(), title: 'New Stage', core: false, icon: 'ai', substages: [] }])}
                                        style={{ width: 56, height: 56, borderRadius: 16, border: '1px solid #D5D9EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {false && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>Customize pipeline stages</span>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>Create, modify, reorder, and delete stages and sub-stages. Core stages are fixed and cannot be moved.</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setPipelineStages([
                                            {
                                                id: guid(), title: 'CV Screening', core: true, icon: 'cv',
                                                substages: [
                                                    { id: guid(), label: 'Waiting Submission', automated: true },
                                                    { id: guid(), label: 'For Review', automated: false },
                                                ]
                                            },
                                            {
                                                id: guid(), title: 'AI Interview', core: true, icon: 'ai',
                                                substages: [
                                                    { id: guid(), label: 'Waiting Interview', automated: true },
                                                    { id: guid(), label: 'For Review', automated: false },
                                                ]
                                            },
                                            {
                                                id: guid(), title: 'Final Human Interview', core: true, icon: 'human',
                                                substages: [
                                                    { id: guid(), label: 'Waiting Schedule', automated: true },
                                                    { id: guid(), label: 'Waiting Interview', automated: false },
                                                    { id: guid(), label: 'For Review', automated: false },
                                                ]
                                            },
                                            {
                                                id: guid(), title: 'Job Offer', core: true, icon: 'offer',
                                                substages: [
                                                    { id: guid(), label: 'For Final Review', automated: false },
                                                    { id: guid(), label: 'Waiting Offer Acceptance', automated: true },
                                                    { id: guid(), label: 'For Contract Signing', automated: false },
                                                    { id: guid(), label: 'Hired', automated: false },
                                                ]
                                            },
                                        ])}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111827', border: '1px solid #D5D7DA', padding: '8px 12px', borderRadius: 24, cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        <span>Restore to default</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => console.log('Copy pipeline from existing job')}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111827', border: '1px solid #D5D7DA', padding: '8px 12px', borderRadius: 24, cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        <span>Copy pipeline from existing job</span>
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                                {pipelineStages.map((stage) => (
                                    <div key={stage.id} style={{ minWidth: 280, background: '#fff', border: '1px dashed #D5D9EB', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12, fontWeight: 600 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#667085', strokeWidth: 1.5 }}>
                                                <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2Z" />
                                                <path d="M17 9V7a5 5 0 0 0-10 0v2" />
                                            </svg>
                                            <span>Core stage, cannot move</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {stage.icon === 'ai' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M12 1v22M5 8h14M7 17h10" />
                                                        </svg>
                                                    )}
                                                    {stage.icon === 'cv' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm9 0v5h5" />
                                                        </svg>
                                                    )}
                                                    {stage.icon === 'human' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 9a7 7 0 0 0-14 0" />
                                                        </svg>
                                                    )}
                                                    {stage.icon === 'offer' && (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                            <path d="M3 7h18M7 7v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>{stage.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.6 }}>
                                                    <path d="M12 5.5v.01M12 12v.01M12 18.5v.01" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Substages</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {stage.substages.map((ss: any) => (
                                                <div key={ss.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #EAECF5', borderRadius: 22, padding: '10px 12px', background: '#fff' }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{ss.label}</span>
                                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                                                        {ss.automated ? (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                                                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.8 }}>
                                                                <path d="M9 18l6-6-6-6" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div style={{ minWidth: 80, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPipelineStages(list => [...list, { id: guid(), title: 'New Stage', core: false, icon: 'ai', substages: [] }])}
                                        style={{ width: 56, height: 56, borderRadius: 16, border: '1px solid #D5D9EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Save button only relevant for initial required fields; keep disabled state tied to step 0 */}
                    <button
                        disabled={submitting}
                        style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: 60, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.85 : 1 }}
                        onClick={() => handleSave("inactive")}
                    >
                        Save as Unpublished
                    </button>
                    {currentStep === 4 ? (
                        <button
                            disabled={submitting}
                            style={{ width: "fit-content", background: submitting ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: 60, cursor: submitting ? "not-allowed" : "pointer" }}
                            onClick={() => handleSave("active")}
                        >
                            <i className="la la-check-circle" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                            Publish
                        </button>
                    ) : (
                        <button
                            disabled={submitting}
                            style={{ width: "fit-content", background: submitting ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: 60, cursor: submitting ? "not-allowed" : "pointer", opacity: canProceedCurrentStep ? 1 : 0.85 }}
                            onClick={handleContinue}
                        >
                            <i className="la la-arrow-right" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                            Continue
                        </button>
                    )}
                </div>
            </div>

            {/* Stepper */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16, overflowX: "auto" }}>
                {steps.map((label, idx) => {
                    const isActive = idx === currentStep;
                    const isComplete = idx < currentStep; // previous steps considered complete
                    const showAlert = idx === currentStep && showCurrentAlert;
                    const lineColor = "#E9EAEB";
                    const textColor = isActive ? "#111827" : isComplete ? "#181D27" : "#717680";
                    return (
                        <div key={label} style={{ width: "max(242px, 20vw)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {showAlert ? (
                                        <img src="/icons/alert-triangle.svg" alt="step-alert" width={20} height={20} />
                                    ) : isComplete ? (
                                        <img src="/icons/checkV3.svg" alt="step-complete" width={20} height={20} />
                                    ) : (
                                        <StepIcon active={isActive} />
                                    )}
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 2,
                                        borderRadius: 2,
                                        background: idx < currentStep
                                            ? '#111827'
                                            : (idx === currentStep
                                                ? (hasAnyInputForStep(idx) ? undefined : lineColor)
                                                : lineColor),
                                        backgroundImage: idx === currentStep && hasAnyInputForStep(idx)
                                            ? 'linear-gradient(90deg, #111827 50%, #E9EAEB 50%)'
                                            : undefined,
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Divider below stepper */}
            <div style={{ width: "100%", height: 1, background: "#EAECF5", marginBottom: 24 }}></div>

            {/* Step content */}
            {currentStep === 0 && (
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                    {/* Left column */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* 1. Career Information */}
                        <div style={{ background: "#fff", borderRadius: 12, padding: 8 }}>
                            {/* Heading + Content pattern */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "Satoshi, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
                                {/* Heading with padding */}
                                <div style={{ padding: "4px 12px" }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: "#181D27" }}>1. Career Information</span>
                                </div>
                                {/* Content with border and 24px padding and 24px section gap */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 24, border: "1px solid #EAECF5", borderRadius: 8 }}>
                                    {/* Basic Information */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#181D27", marginBottom: 8 }}>Basic Information</div>
                                        <div>
                                            <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Job Title</div>
                                            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                                <input
                                                    className="form-control nwz-input"
                                                    style={{
                                                        padding: "10px 14px",
                                                        paddingRight: isInvalid(jobTitle) ? 44 : 14,
                                                        backgroundImage: isInvalid(jobTitle) ? 'url(/icons/alert-circle.svg)' : undefined,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'calc(100% - 12px) center',
                                                        backgroundSize: '16px 16px'
                                                    }}
                                                    placeholder="Enter job title"
                                                    value={jobTitle}
                                                    aria-invalid={isInvalid(jobTitle) || undefined}
                                                    onChange={(e) => setJobTitle(e.target.value)}
                                                />
                                                {isInvalid(jobTitle) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    </div>

                                    {/* Work Setting */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#181D27", marginBottom: 8 }}>Work Setting</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Employment Type</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <CustomDropdown
                                                        onSelectSetting={(v) => setEmploymentType(v)}
                                                        screeningSetting={employmentType}
                                                        settingList={employmentTypeOptions}
                                                        placeholder="Choose Employment type"
                                                        invalid={attemptedContinue && employmentType.trim().length === 0}
                                                    />
                                                    {attemptedContinue && employmentType.trim().length === 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Arrangement</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <CustomDropdown
                                                        onSelectSetting={(v) => setWorkSetup(v)}
                                                        screeningSetting={workSetup}
                                                        settingList={workSetupOptions}
                                                        placeholder="Choose work arrangement"
                                                        invalid={attemptedContinue && workSetup.trim().length === 0}
                                                    />
                                                    {attemptedContinue && workSetup.trim().length === 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#181D27", marginBottom: 8 }}>Location</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Country</div>
                                                <CustomDropdown
                                                    onSelectSetting={(setting) => {
                                                        setCountry(setting);
                                                    }}
                                                    screeningSetting={country}
                                                    settingList={[{ name: "Philippines" }]}
                                                    placeholder="Philippines"
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>State / Province</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <CustomDropdown
                                                        onSelectSetting={(prov) => {
                                                            setProvince(prov);
                                                            const provinceObj = provinceList.find((p) => p.name === prov);
                                                            const cities = (philippineLocations.cities as any[]).filter((c: any) => c.province === provinceObj.key);
                                                            setCityList(cities);
                                                            setCity("");
                                                        }}
                                                        screeningSetting={province}
                                                        settingList={provinceList}
                                                        placeholder="Choose state / province"
                                                        invalid={attemptedContinue && province.trim().length === 0}
                                                    />
                                                    {attemptedContinue && province.trim().length === 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>City</div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <CustomDropdown
                                                        onSelectSetting={(ct) => setCity(ct)}
                                                        screeningSetting={city}
                                                        settingList={cityList}
                                                        placeholder="Choose city"
                                                        invalid={attemptedContinue && city.trim().length === 0}
                                                    />
                                                    {attemptedContinue && city.trim().length === 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salary */}
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Salary</div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 24 }}>
                                                <label className="switch" style={{ display: "flex", alignItems: "center", margin: 0 }}>
                                                    <input type="checkbox" checked={salaryNegotiable} onChange={() => setSalaryNegotiable(!salaryNegotiable)} />
                                                    <span className="slider round"></span>
                                                </label>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: '16px', fontFamily: 'Satoshi', fontSize: 14, fontWeight: 500, color: '#414651' }}>Negotiable</span>
                                            </div>
                                        </div>
                                        <div className="nwz-salary-wrapper">
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Minimum Salary</div>
                                                <div className="nwz-salary-box" style={{ position: 'relative', border: (attemptedContinue && (minimumSalary === "" || minimumSalary === null)) ? '1px solid #F04438' : undefined }}>
                                                    <span className="symbol">₱</span>
                                                    <input type="number" placeholder="0" min={0} value={minimumSalary as any} onChange={(e) => setMinimumSalary(e.target.value || "")} />
                                                    <span className="ccy" style={{ marginRight: (attemptedContinue && (minimumSalary === "" || minimumSalary === null)) ? 24 : 0 }}>PHP</span>
                                                    {(attemptedContinue && (minimumSalary === "" || minimumSalary === null)) && (
                                                        <img src="/icons/alert-circle.svg" width={16} height={16} alt="error" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                                    )}
                                                </div>
                                                {attemptedContinue && (minimumSalary === "" || minimumSalary === null) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Maximum Salary</div>
                                                <div className="nwz-salary-box" style={{ position: 'relative', border: (attemptedContinue && (maximumSalary === "" || maximumSalary === null)) ? '1px solid #F04438' : undefined }}>
                                                    <span className="symbol">₱</span>
                                                    <input type="number" placeholder="0" min={0} value={maximumSalary as any} onChange={(e) => setMaximumSalary(e.target.value || "")} />
                                                    <span className="ccy" style={{ marginRight: (attemptedContinue && (maximumSalary === "" || maximumSalary === null)) ? 24 : 0 }}>PHP</span>
                                                    {(attemptedContinue && (maximumSalary === "" || maximumSalary === null)) && (
                                                        <img src="/icons/alert-circle.svg" width={16} height={16} alt="error" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                                    )}
                                                </div>
                                                {attemptedContinue && (maximumSalary === "" || maximumSalary === null) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Job Description */}
                        <div style={{ background: "#fff", borderRadius: 12, padding: 8 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "Satoshi, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
                                <div style={{ padding: "4px 12px" }}>
                                    <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>2. Job Description</span>
                                </div>
                                <div style={{ padding: 24, border: "1px solid #E9EAEB", borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
                                    <RichTextEditor text={description} setText={setDescription} invalid={isInvalid(description)} />
                                    {isInvalid(description) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                            <span style={{ fontSize: 12, fontWeight: 500, color: '#F04438' }}>This is a required field</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Team Access */}
                        <div style={{ background: "#fff", borderRadius: 12, padding: 8 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "Satoshi, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
                                <div style={{ padding: "4px 12px" }}>
                                    <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>3. Team Access</span>
                                </div>
                                {/* Content container: vertical, 16px gap */}
                                <div style={{ padding: 24, border: "1px solid #EAECF5", borderRadius: 8, display: "flex", flexDirection: "column", gap: 16, position: 'relative' }}>
                                    {/* Frame 1: heading+desc left, Add member button right */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Add more members</div>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: "#717680" }}>You can add other members to collaborate on this career.</div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                type="button"
                                                onClick={() => setMemberPickerOpen(v => !v)}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 8,
                                                    border: memberPickerOpen ? "1px solid #D0D5DD" : "1px solid #E9EAEB",
                                                    boxShadow: memberPickerOpen ? '0 1px 2px rgba(16,24,40,0.05)' : 'none',
                                                    borderRadius: 8,
                                                    padding: "10px 14px",
                                                    minWidth: 200,
                                                    background: "#fff",
                                                    color: "#717680",
                                                    cursor: "pointer",
                                                    fontSize: 16,
                                                    fontWeight: 500
                                                }}
                                            >
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 500, color: '#717680' }}>
                                                    <img src="/icons/user2.svg" alt="users" width={20} height={20} />
                                                    <span>Add member</span>
                                                </span>
                                                <i className="la la-angle-down" style={{ color: "#717680" }}></i>
                                            </button>
                                            {memberPickerOpen && (
                                                <div style={{ position: 'absolute', right: 0, bottom: 'calc(100% + 8px)', width: 320, background: '#FFFFFF', border: '1px solid #E9EAEB', boxShadow: '0px 4px 8px rgba(0,0,0,0.04), 0px 2px 4px rgba(0,0,0,0.03)', borderRadius: 12, zIndex: 20, display: 'flex', flexDirection: 'column' }}>
                                                    {/* Search header */}
                                                    <div style={{ padding: 12 }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <img src="/icons/search.svg" alt="search" width={16} height={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                                                            <input
                                                                autoFocus
                                                                value={memberSearch}
                                                                onChange={(e) => setMemberSearch(e.target.value)}
                                                                placeholder="Search member"
                                                                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #E9EAEB', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#181D27' }}
                                                                className="nwz-input"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ width: '100%', height: 1, background: '#F5F5F5' }}></div>
                                                    {/* Members list */}
                                                    <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
                                                        {allOrgMembers
                                                            .filter(m => {
                                                                if (!memberSearch) return true;
                                                                return (m.email || '').toLowerCase().includes(memberSearch.toLowerCase()) || (m.name || '').toLowerCase().includes(memberSearch.toLowerCase());
                                                            })
                                                            .map(m => {
                                                                const already = teamMembers.some(tm => tm.email === m.email);
                                                                return (
                                                                    <button
                                                                        key={m._id || m.email}
                                                                        onClick={() => { addMember(m.email, 'Contributor'); setMemberPickerOpen(false); setMemberSearch(''); }}
                                                                        disabled={already}
                                                                        style={{
                                                                            width: '100%',
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            textAlign: 'left',
                                                                            cursor: already ? 'not-allowed' : 'pointer',
                                                                            padding: '4px 12px',
                                                                            display: 'flex',
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center',
                                                                            gap: 8,
                                                                            opacity: already ? 0.6 : 1,
                                                                        }}
                                                                    >
                                                                        {m.image ? (
                                                                            <img src={m.image} alt={m.email} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                                                                        ) : (
                                                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#181D27' }}>{getInitials(m.email || m.name)}</div>
                                                                        )}
                                                                        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, minWidth: 0, alignItems: 'center' }}>
                                                                            <span style={{ fontSize: 14, fontWeight: 500, color: '#181D27', whiteSpace: 'nowrap' }}>{m.name || m.email}</span>
                                                                            <span style={{ fontSize: 14, fontWeight: 500, color: '#717680', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{m.email}</span>
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                    {/* Divider */}
                                    <div style={{ width: "100%", height: 1, background: "#E9EAEB" }}></div>

                                    {/* Warning: requires a job owner */}
                                    {!hasJobOwner && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F04438' }}>
                                            <img src="/icons/alert-triangle.svg" alt="alert" width={20} height={20} />
                                            <span style={{ fontSize: 14, fontWeight: 500 }}>Career must have a job owner. Please assign a job owner.</span>
                                        </div>
                                    )}

                                    {/* Frame 2: member list */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {teamMembers.map((m) => (
                                            <div key={m.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    {user?.email === m.email && user?.image ? (
                                                        <img src={user.image} alt={m.email} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#181D27' }}>{getInitials(m.email)}</div>
                                                    )}
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#181D27' }}>{m.email === user?.email ? `${user?.name || m.email} (You)` : m.email}</span>
                                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#717680' }}>{m.email}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                                                    <div style={{ minWidth: 220, position: 'relative' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRolePickerFor(rolePickerFor === m.email ? null : m.email)}
                                                            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: rolePickerFor === m.email ? '1px solid #D0D5DD' : '1px solid #E9EAEB', borderRadius: 8, padding: '10px 14px', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 500, color: '#181D27' }}
                                                        >
                                                            <span style={{ fontSize: 16, fontWeight: 500, color: '#181D27' }}>{m.role}</span>
                                                            <i className="la la-angle-down" style={{ color: '#717680' }}></i>
                                                        </button>
                                                        {rolePickerFor === m.email && (
                                                            <div style={{ position: 'absolute', top: 0, left: 'calc(100% + 8px)', width: 320, background: '#FFFFFF', border: '1px solid #E9EAEB', borderRadius: 8, padding: 8, zIndex: 30, boxShadow: '0px 4px 8px rgba(0,0,0,0.04), 0px 2px 4px rgba(0,0,0,0.03)' }}>
                                                                {[
                                                                    { title: 'Job Owner', desc: 'Leads the hiring process for assigned jobs. Has access with all career settings.' },
                                                                    { title: 'Contributor', desc: 'Helps evaluate candidates and assist with hiring tasks. Can move candidates through the pipeline, but cannot change any career settings.' },
                                                                    { title: 'Reviewer', desc: 'Reviews candidates and provides feedback. Can only view candidate profiles and comment.' },
                                                                ].map((opt) => {
                                                                    const selected = m.role === opt.title;
                                                                    return (
                                                                        <button
                                                                            key={opt.title}
                                                                            onClick={() => { updateMemberRole(m.email, opt.title as TeamMember['role']); setRolePickerFor(null); }}
                                                                            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, padding: 0 }}
                                                                        >
                                                                            <div style={{ padding: '10px 14px', borderRadius: 8, background: selected ? '#EEF4FF' : 'transparent', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{opt.title}</span>
                                                                                    {selected && <img src="/icons/checkV4.svg" width={20} height={20} alt="selected" />}
                                                                                </div>
                                                                                <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>{opt.desc}</span>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => removeMember(m.email)}
                                                        style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E9EAEB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                        title="Remove"
                                                    >
                                                        <img src="/icons/trash-2.svg" alt="remove" width={20} height={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Supporting text */}
                                    <div style={{ fontSize: 12, lineHeight: "18px", fontWeight: 500, color: "#717680" }}>
                                        *Admins can view all careers regardless of specific access settings.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column - Tips panel */}
                    <div style={{ width: 'min(320px, 100dvh)', display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ background: "#fff", border: "1px solid #E9EAEB", borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Heading */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img src="/icons/tips_and_updates.svg" alt="tips" width={20} height={20} />
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>Tips</span>
                            </div>
                            {/* Content */}
                            <div style={{ padding: 24 }}>
                                <p style={{ margin: 0, lineHeight: '20px', marginBottom: 14 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#181D27' }}>Use clear, standard job titles</span>
                                    <span style={{ fontWeight: 500, fontSize: 14, color: '#667085' }}> for better searchability (e.g., “Software Engineer” instead of “Code Ninja” or “Tech Rockstar”).</span>
                                </p>
                                <p style={{ margin: 0, lineHeight: '20px', marginBottom: 14 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#181D27' }}>Avoid abbreviations</span>
                                    <span style={{ fontWeight: 500, fontSize: 14, color: '#667085' }}> or internal role codes that applicants may not understand (e.g., use “QA Engineer” instead of “QE II” or “QA-TL”).</span>
                                </p>
                                <p style={{ margin: 0, lineHeight: '20px' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#181D27' }}>Keep it concise</span>
                                    <span style={{ fontWeight: 500, fontSize: 14, color: '#667085' }}> — job titles should be no more than a few words (2–4 max), avoiding fluff or marketing terms.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 1 && (
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* 1. CV Review Settings */}
                        <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ padding: '4px 12px' }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>1. CV Review Settings</span>
                                </div>
                                <div style={{ padding: 24, border: '1px solid #EAECF5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* CV Screening */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>CV Screening</span>
                                            <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>Jia automatically endorses candidates who meet the chosen criteria.</span>
                                        </div>
                                        <div style={{ maxWidth: 360 }}>
                                            <CustomDropdown
                                                variant="screening"
                                                onSelectSetting={(v) => setScreeningSetting(v)}
                                                screeningSetting={screeningSetting}
                                                settingList={screeningOptions}
                                                placeholder="Good Fit and Above"
                                            />
                                        </div>
                                    </div>

                                    <div style={{ width: '100%', height: 1, background: '#E9EAEB', margin: '8px 0' }}></div>

                                    {/* CV Secret Prompt */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 250 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <img src="/icons/sparkle.svg" alt="sparkle" width={19} height={19} />
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>CV Secret Prompt <span style={{ fontWeight: 500, color: '#717680' }}>(optional)</span></span>
                                            <span title="These prompts remain hidden from candidates and the public job portal. Additionally, only Admins and the Job Owner can view the secret prompt." style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', border: '1px solid #D0D5DD', color: '#667085', fontSize: 12, cursor: 'help' }}>i</span>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>
                                            Secret Prompts give you extra control over Jia’s evaluation style, complementing her accurate assessment of requirements from the job description.
                                        </div>
                                        <textarea
                                            ref={cvSecretPromptRef}
                                            value={cvSecretPrompt}
                                            onChange={(e) => {
                                                let v = e.target.value;
                                                if (v.length > 0 && !v.startsWith('• ')) {
                                                    v = '• ' + v;
                                                }
                                                setCvSecretPrompt(v);
                                            }}
                                            onKeyDown={(e) => {
                                                const ta = e.currentTarget as HTMLTextAreaElement;
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const start = ta.selectionStart ?? 0;
                                                    const end = ta.selectionEnd ?? start;
                                                    const before = cvSecretPrompt.slice(0, start);
                                                    const after = cvSecretPrompt.slice(end);
                                                    const insert = '\n• ';
                                                    const next = before + insert + after;
                                                    setCvSecretPrompt(next);
                                                    // place caret after inserted bullet
                                                    requestAnimationFrame(() => {
                                                        const t = cvSecretPromptRef.current;
                                                        if (t) {
                                                            const pos = start + insert.length;
                                                            t.selectionStart = pos;
                                                            t.selectionEnd = pos;
                                                            t.focus();
                                                        }
                                                    });
                                                }
                                                // Shift+Enter or natural wrapping: let browser handle default (no extra bullet)
                                            }}
                                            placeholder="Enter a secret prompt (e.g. Give higher fit scores to candidates who participate in hackathons or competitions.)"
                                            className="form-control nwz-input"
                                            style={{ padding: '10px 14px', minHeight: 120, resize: 'vertical', whiteSpace: 'pre-wrap' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Pre-Screening Questions (optional) */}
                        <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>2. Pre-Screening Questions <span style={{ fontWeight: 500, color: '#717680' }}>(optional)</span></span>
                                        <div style={{ borderRadius: '50%', width: 30, height: 22, border: '1px solid #D5D9EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, backgroundColor: '#F8F9FC', color: '#181D27', fontWeight: 700 }}>
                                            {preScreeningQuestions.length}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111827', color: '#fff', border: '1px solid #E9EAEB', padding: '8px 12px', borderRadius: 24, cursor: 'pointer' }}
                                        onClick={() => {
                                            // Add a new blank question and focus it in the editor
                                            setPreScreeningQuestions((list) => [
                                                ...list,
                                                { id: guid(), prompt: '', answerType: 'Short Answer', options: [] },
                                            ]);
                                        }}
                                    >
                                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                                        <span style={{ fontWeight: 700 }}>Add custom</span>
                                    </button>
                                </div>
                            </div>

                            {/* Suggested Pre-screening Questions */}
                            <div style={{ padding: 16, border: '1px solid #E9EAEB', borderRadius: 8, marginBottom: 12 }}>

                                {/* Screening Placeholder */}
                                <div style={{ borderRadius: 8 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {preScreeningQuestions.length === 0 && (
                                            <div style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>No pre-screening questions added yet.</div>
                                        )}

                                        {preScreeningQuestions.map((q, idx) => (
                                            <div key={q.id} style={{ border: '1px solid #E9EAEB', borderRadius: 8, padding: 12 }}>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <div title="Drag Indicator" style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}>
                                                        <img src="/icons/drag.svg" alt="drag" width={16} height={16} />
                                                    </div>
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '24px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <input
                                                                    className="form-control nwz-input"
                                                                    placeholder={`Question ${idx + 1}`}
                                                                    value={q.prompt}
                                                                    onChange={(e) =>
                                                                        setPreScreeningQuestions((list) =>
                                                                            list.map((it) => (it.id === q.id ? { ...it, prompt: e.target.value } : it))
                                                                        )
                                                                    }
                                                                    style={{ padding: '10px 14px' }}
                                                                />
                                                            </div>
                                                            <div style={{ minWidth: 220 }}>
                                                                <CustomDropdown
                                                                    variant="preScreening"
                                                                    onSelectSetting={(v) =>
                                                                        setPreScreeningQuestions((list) =>
                                                                            list.map((it) =>
                                                                                it.id === q.id
                                                                                    ? {
                                                                                        ...it,
                                                                                        answerType: (v as any) as PreScreenQuestion['answerType'],
                                                                                    }
                                                                                    : it
                                                                            )
                                                                        )
                                                                    }
                                                                    screeningSetting={q.answerType}
                                                                    settingList={preScreeningOptions}
                                                                    placeholder="Answer type"
                                                                />
                                                            </div>
                                                        </div>

                                                        {q.answerType === 'Dropdown' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {(q.options || []).map((opt, oidx) => (
                                                                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div style={{ width: 24, textAlign: 'right', color: '#717680', fontWeight: 600 }}>{oidx + 1}</div>
                                                                        <input
                                                                            className="form-control nwz-input"
                                                                            placeholder={`Option ${oidx + 1}`}
                                                                            value={opt.text}
                                                                            onChange={(e) =>
                                                                                setPreScreeningQuestions((list) =>
                                                                                    list.map((it) =>
                                                                                        it.id === q.id
                                                                                            ? {
                                                                                                ...it,
                                                                                                options: (it.options || []).map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                                                                                            }
                                                                                            : it
                                                                                    )
                                                                                )
                                                                            }
                                                                            style={{ padding: '10px 14px', flex: 1 }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setPreScreeningQuestions((list) =>
                                                                                    list.map((it) =>
                                                                                        it.id === q.id
                                                                                            ? { ...it, options: (it.options || []).filter((o) => o.id !== opt.id) }
                                                                                            : it
                                                                                    )
                                                                                )
                                                                            }
                                                                            style={{ width: 36, height: 36, borderRadius: 24, border: '1px solid #E9EAEB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                            title="Remove option"
                                                                        >
                                                                            <svg width="16" height="16" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#535862', strokeWidth: '2' }}>
                                                                                <path d="M18 6.66504L6 18.665M6 6.66504L18 18.665" stroke-linecap="round" stroke-linejoin="round" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <div style={{ padding: "0 16px" }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreScreeningQuestions((list) =>
                                                                                list.map((it) =>
                                                                                    it.id === q.id
                                                                                        ? { ...it, options: [...(it.options || []), { id: guid(), text: '' }] }
                                                                                        : it
                                                                                )
                                                                            )
                                                                        }
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: '#fff', color: '#535862', padding: '8px 14px', cursor: 'pointer', fontWeight: 700 }}
                                                                    >
                                                                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Option
                                                                    </button>
                                                                </div>

                                                                {/* Divider */}
                                                                <div style={{ width: "100%", height: 1, background: "#E9EAEB" }}></div>

                                                                <div style={{ display: "flex", justifyContent: "end" }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreScreeningQuestions((list) => list.filter((it) => it.id !== q.id))}
                                                                        style={{ borderRadius: '24px', border: '1px solid #FDA29B', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 8, padding: '8px 14px', margin: '24px 0' }}
                                                                        title="Remove question"
                                                                    >
                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#B32318', strokeWidth: '1.5' }}>
                                                                            <path d="M3 6h18" stroke-linecap="round" />
                                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" />
                                                                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round" />
                                                                            <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                                                                        </svg>
                                                                        <span style={{ color: "#B32318", fontWeight: 700, textWrap: 'nowrap' }}>Delete Question</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {q.answerType === 'Checkboxes' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {(q.options || []).map((opt, oidx) => (
                                                                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div style={{ width: 24, textAlign: 'right', color: '#717680', fontWeight: 600 }}>{oidx + 1}.</div>
                                                                        <input
                                                                            className="form-control nwz-input"
                                                                            placeholder={`Option ${oidx + 1}`}
                                                                            value={opt.text}
                                                                            onChange={(e) =>
                                                                                setPreScreeningQuestions((list) =>
                                                                                    list.map((it) =>
                                                                                        it.id === q.id
                                                                                            ? {
                                                                                                ...it,
                                                                                                options: (it.options || []).map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                                                                                            }
                                                                                            : it
                                                                                    )
                                                                                )
                                                                            }
                                                                            style={{ padding: '10px 14px', flex: 1 }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setPreScreeningQuestions((list) =>
                                                                                    list.map((it) =>
                                                                                        it.id === q.id
                                                                                            ? { ...it, options: (it.options || []).filter((o) => o.id !== opt.id) }
                                                                                            : it
                                                                                    )
                                                                                )
                                                                            }
                                                                            style={{ width: 36, height: 36, borderRadius: 24, border: '1px solid #E9EAEB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                            title="Remove option"
                                                                        >
                                                                            <svg width="16" height="16" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#535862', strokeWidth: '2' }}>
                                                                                <path d="M18 6.66504L6 18.665M6 6.66504L18 18.665" stroke-linecap="round" stroke-linejoin="round" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <div style={{ padding: "0 16px" }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPreScreeningQuestions((list) =>
                                                                                list.map((it) =>
                                                                                    it.id === q.id
                                                                                        ? { ...it, options: [...(it.options || []), { id: guid(), text: '' }] }
                                                                                        : it
                                                                                )
                                                                            )
                                                                        }
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: '#fff', color: '#535862', padding: '8px 14px', cursor: 'pointer', fontWeight: 700 }}
                                                                    >
                                                                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Option
                                                                    </button>
                                                                </div>
                                                                <div style={{ width: "100%", height: 1, background: "#E9EAEB" }}></div>
                                                                <div style={{ display: "flex", justifyContent: "end" }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreScreeningQuestions((list) => list.filter((it) => it.id !== q.id))}
                                                                        style={{ borderRadius: '24px', border: '1px solid #FDA29B', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 8, padding: '8px 14px', margin: '24px 0' }}
                                                                        title="Remove question"
                                                                    >
                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#B32318', strokeWidth: '1.5' }}>
                                                                            <path d="M3 6h18" stroke-linecap="round" />
                                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" />
                                                                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round" />
                                                                            <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                                                                        </svg>
                                                                        <span style={{ color: "#B32318", fontWeight: 700, textWrap: 'nowrap' }}>Delete Question</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {q.answerType === 'Range' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                {/* Currency selector */}
                                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                    <div style={{ minWidth: 140 }}>
                                                                        <CustomDropdown
                                                                            onSelectSetting={(v) => setPreScreeningQuestions(list => list.map(it => it.id === q.id ? { ...it, currency: v } : it))}
                                                                            screeningSetting={q.currency || 'PHP'}
                                                                            settingList={[{ name: 'PHP' }, { name: 'USD' }]}
                                                                            placeholder="Currency"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 12 }}>
                                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#667085' }}>Minimum Value</span>
                                                                        <div className="nwz-salary-box" style={{ position: 'relative' }}>
                                                                            <span className="symbol">{(q.currency || 'PHP') === 'USD' ? '$' : '₱'}</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="0"
                                                                                min={0}
                                                                                value={q.options?.[0]?.text || ''}
                                                                                onChange={(e) => {
                                                                                    const v = e.target.value;
                                                                                    setPreScreeningQuestions(list => list.map(it => it.id === q.id ? { ...it, options: [{ id: q.options?.[0]?.id || guid(), text: v }, ...(it.options?.slice(1) || [])] } : it));
                                                                                }}
                                                                            />
                                                                            <span className="ccy">{q.currency || 'PHP'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#667085' }}>Maximum Value</span>
                                                                        <div className="nwz-salary-box" style={{ position: 'relative' }}>
                                                                            <span className="symbol">{(q.currency || 'PHP') === 'USD' ? '$' : '₱'}</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="0"
                                                                                min={0}
                                                                                value={q.options?.[1]?.text || ''}
                                                                                onChange={(e) => {
                                                                                    const v = e.target.value;
                                                                                    setPreScreeningQuestions(list => list.map(it => it.id === q.id ? { ...it, options: [it.options?.[0] || { id: guid(), text: '' }, { id: it.options?.[1]?.id || guid(), text: v }] } : it));
                                                                                }}
                                                                            />
                                                                            <span className="ccy">{q.currency || 'PHP'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ width: '100%', height: 1, background: '#E9EAEB' }}></div>
                                                                <div style={{ display: 'flex', justifyContent: 'end' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreScreeningQuestions((list) => list.filter((it) => it.id !== q.id))}
                                                                        style={{ borderRadius: '24px', border: '1px solid #FDA29B', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 8, padding: '8px 14px', margin: '24px 0' }}
                                                                        title="Remove question"
                                                                    >
                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#B32318', strokeWidth: '1.5' }}>
                                                                            <path d="M3 6h18" stroke-linecap="round" />
                                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" />
                                                                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round" />
                                                                            <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                                                                        </svg>
                                                                        <span style={{ color: '#B32318', fontWeight: 700, textWrap: 'nowrap' }}>Delete Question</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(q.answerType === 'Short Answer' || q.answerType === 'Long Answer') && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                {/* No extra configuration required for short/long answers */}
                                                                <div style={{ width: '100%', height: 1, background: '#E9EAEB' }}></div>
                                                                <div style={{ display: 'flex', justifyContent: 'end' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPreScreeningQuestions((list) => list.filter((it) => it.id !== q.id))}
                                                                        style={{ borderRadius: '24px', border: '1px solid #FDA29B', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 8, padding: '8px 14px', margin: '24px 0' }}
                                                                        title="Remove question"
                                                                    >
                                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#B32318', strokeWidth: '1.5' }}>
                                                                            <path d="M3 6h18" stroke-linecap="round" />
                                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" />
                                                                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round" />
                                                                            <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                                                                        </svg>
                                                                        <span style={{ color: '#B32318', fontWeight: 700, textWrap: 'nowrap' }}>Delete Question</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Divider below stepper */}
                                <div style={{ width: "100%", height: 1, background: "#EAECF5", marginTop: 24, marginBottom: 24 }}></div>

                                <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27', marginBottom: 8 }}>Suggested Pre-screening Questions:</div>
                                {[
                                    { t: 'Notice Period', s: 'How long is your notice period?', type: 'Dropdown' as const },
                                    { t: 'Work Setup', s: 'How often are you willing to report to the office each week?', type: 'Dropdown' as const },
                                    { t: 'Asking Salary', s: 'How much is your expected monthly salary?', type: 'Range' as const },
                                ].map((q) => {
                                    const already = preScreeningQuestions.some((x) => x.prompt === q.s);
                                    return (
                                        <div key={q.t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{q.t}</div>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>{q.s}</div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={already}
                                                onClick={() =>
                                                    setPreScreeningQuestions((list) => [
                                                        ...list,
                                                        {
                                                            id: guid(),
                                                            prompt: q.s,
                                                            answerType: q.type,
                                                            options:
                                                                q.type === 'Range'
                                                                    ? [
                                                                        { id: guid(), text: '' },
                                                                        { id: guid(), text: '' },
                                                                    ]
                                                                    : q.type === 'Dropdown'
                                                                        ? (
                                                                            q.t === 'Notice Period'
                                                                                ? [
                                                                                    { id: guid(), text: 'Immediately' },
                                                                                    { id: guid(), text: '< 30 days' },
                                                                                    { id: guid(), text: '> 30 days' },
                                                                                ]
                                                                                : q.t === 'Work Setup'
                                                                                    ? [
                                                                                        { id: guid(), text: '0 days (Fully Remote)' },
                                                                                        { id: guid(), text: '1 day/week' },
                                                                                        { id: guid(), text: '2-3 days/week' },
                                                                                        { id: guid(), text: '4-5 days/week (Onsite)' },
                                                                                    ]
                                                                                    : []
                                                                        )
                                                                        : [],
                                                        },
                                                    ])
                                                }
                                                style={{ border: '1px solid #E9EAEB', background: already ? '#F5F5F5' : '#fff', color: '#111827', padding: '6px 12px', borderRadius: 20, cursor: already ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: already ? 0.7 : 1 }}
                                            >
                                                {already ? 'Added' : 'Add'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    {/* Right rail placeholder to match layout */}
                    <div style={{ width: 'min(320px, 100dvh)' }}>
                        <div style={{ background: '#fff', border: '1px solid #E9EAEB', borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <img src="/icons/info.svg" width={16} height={16} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>About this step</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#667085', lineHeight: '20px' }}>
                                Generate and curate interview questions by category. You can reorder categories and questions to match your flow.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    {/* Left column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* 1. AI Interview Setup */}
                        <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ padding: '4px 12px' }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>1. AI Interview Settings</span>
                                </div>
                                <div style={{ padding: 24, border: '1px solid #EAECF5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {/* Interview Mode */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>AI Interview Screening</div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>Jia automatically endorses candidates who meet the chosen criteria.</div>
                                        <div style={{ width: 300 }}>
                                            <CustomDropdown
                                                variant="screening"
                                                onSelectSetting={(v) => setScreeningSetting(v)}
                                                screeningSetting={screeningSetting}
                                                settingList={screeningOptions}
                                                placeholder="Good Fit and Above"
                                            />
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ width: "100%", height: 1, background: "#E9EAEB", marginTop: 24, marginBottom: 24 }}></div>

                                    {/* Require Video */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Require Video on Interview </div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>Require candidates to keep their camera on. Recordings will appear on their analysis page. </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                                <img src="/icons/cam.svg" alt="camcorder" />
                                                <span>Require Video Interview</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <label className="switch" style={{ display: "flex", alignItems: "center", margin: 0 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={requireVideo}
                                                        onChange={() => setRequireVideo(v => !v)}
                                                    />
                                                    <span className="slider round"></span>
                                                </label>
                                                <span>{requireVideo ? "Yes" : "No"}</span>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ width: "100%", height: 1, background: "#E9EAEB", marginTop: 24, marginBottom: 24 }}></div>

                                    {/* AI Interview Secret Prompt */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 250 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <img src="/icons/sparkle.svg" alt="sparkle" width={19} height={19} />
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>AI Interview Secret Prompt <span style={{ fontWeight: 500, color: '#717680' }}>(optional)</span></span>
                                            <span title="These prompts remain hidden from candidates and the public job portal. Additionally, only Admins and the Job Owner can view the secret prompt." style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', border: '1px solid #D0D5DD', color: '#667085', fontSize: 12, cursor: 'help' }}>i</span>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>
                                            Secret Prompts give you extra control over Jia’s evaluation style, complementing her accurate assessment of requirements from the job description.
                                        </div>
                                        <textarea
                                            ref={secretPromptRef}
                                            value={secretPrompt}
                                            onChange={(e) => {
                                                let v = e.target.value;
                                                if (v.length > 0 && !v.startsWith('• ')) {
                                                    v = '• ' + v;
                                                }
                                                setSecretPrompt(v);
                                            }}
                                            onKeyDown={(e) => {
                                                const ta = e.currentTarget as HTMLTextAreaElement;
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    const start = ta.selectionStart ?? 0;
                                                    const end = ta.selectionEnd ?? start;
                                                    const before = secretPrompt.slice(0, start);
                                                    const after = secretPrompt.slice(end);
                                                    const insert = '\n• ';
                                                    const next = before + insert + after;
                                                    setSecretPrompt(next);
                                                    // place caret after inserted bullet
                                                    requestAnimationFrame(() => {
                                                        const t = secretPromptRef.current;
                                                        if (t) {
                                                            const pos = start + insert.length;
                                                            t.selectionStart = pos;
                                                            t.selectionEnd = pos;
                                                            t.focus();
                                                        }
                                                    });
                                                }
                                                // Shift+Enter or natural wrapping: let browser handle default (no extra bullet)
                                            }}
                                            placeholder="Enter a secret prompt (e.g. Treat candidates who speak in Taglish, English, or Tagalog equally. Focus on clarity, coherence, and confidence rather than language preference or accent.)"
                                            className="form-control nwz-input"
                                            style={{ padding: '10px 14px', minHeight: 120, resize: 'vertical', whiteSpace: 'pre-wrap', height: 50 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. AI Interview Setup */}
                        <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ padding: '4px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>2. AI Interview Questions</span>
                                            <div
                                                style={{
                                                    borderRadius: '50%',
                                                    width: 25,
                                                    height: 22,
                                                    border: '1px solid #D5D9EB',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 14,
                                                    backgroundColor: '#F8F9FC',
                                                    color: '#363F72',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {questions.reduce((sum, cat) => sum + (cat.questions?.length || 0), 0)}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // TODO: trigger AI generation flow for this heading
                                                handleGenerateAll();
                                            }}
                                            disabled={generatingAll}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: '#111827',
                                                color: '#fff',
                                                border: '1px solid #E9EAEB',
                                                padding: '8px 14px',
                                                borderRadius: 24,
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                fontWeight: 700
                                            }}
                                        >
                                            <img src="/icons/sparklewhite.svg" alt="" width={16} height={16} />
                                            <span>{generatingAll ? 'Generating…' : 'Generate all questions'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div style={{ padding: 24, border: '1px solid #EAECF5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {attemptedContinue && !allCategoriesHaveAtLeastOne.status && (
                                        <div style={{
                                            background: '#FEF3F2',
                                            border: '1px solid #FDA29B',
                                            color: '#B42318',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}>
                                            <img src="/icons/alert-triangle.svg" width={18} height={18} alt="alert" />
                                            <span>Please add at least {allCategoriesHaveAtLeastOne.remaining} interview questions.</span>
                                        </div>
                                    )}
                                    {["CV Validation / Experience", "Technical", "Behavioural", "Analytical", "Others"].map((heading, idx, arr) => (
                                        <React.Fragment key={heading}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', justifyContent: 'space-between', gap: 16 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{heading}</span>
                                                    {(() => {
                                                        const catName = heading === 'Behavioural' ? 'Behavioral' : heading;
                                                        const ci = questions.findIndex((c) => c.category === catName);
                                                        const cat = ci >= 0 ? questions[ci] : null;
                                                        if (!cat || !(cat.questions || []).length) return null;
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                                                                {(cat.questions || []).map((q: any, qi: number) => (
                                                                    <div key={q.id || qi} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 12, border: '1px solid #E9EAEB', borderRadius: 8, padding: '8px 12px' }}>
                                                                        <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <img src="/icons/drag.svg" alt="drag" width={16} height={16} />
                                                                        </div>
                                                                        <input
                                                                            placeholder={`Question ${qi + 1}`}
                                                                            value={(q.text ?? q.prompt ?? '') as string}
                                                                            onChange={(e) => {
                                                                                const v = e.target.value;
                                                                                setQuestions((list: any[]) => list.map((c, idx) => idx === ci ? { ...c, questions: (c.questions || []).map((qq: any, qidx: number) => qidx === qi ? { ...qq, text: v, prompt: v } : qq) } : c));
                                                                            }}
                                                                            style={{ padding: '10px 14px', border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent', width: '100%' }}
                                                                        />
                                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => { /* placeholder edit action */ }}
                                                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: 82, height: 36, borderRadius: 24, border: '1px solid #D5D7DA', background: '#fff', cursor: 'pointer', padding: '8px 14px' }}
                                                                                title="Edit"
                                                                            >
                                                                                <img src="/icons/pen.svg" alt="edit" width={16} height={16} />
                                                                                <span style={{ fontWeight: 700 }}>Edit</span>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setQuestions((list: any[]) => list.map((c, idx) => idx === ci ? { ...c, questions: (c.questions || []).filter((_: any, qidx: number) => qidx !== qi) } : c));
                                                                                }}
                                                                                style={{ width: 36, height: 36, borderRadius: 24, border: '1px solid #FDA29B', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                                title="Delete"
                                                                            >
                                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#B32318', strokeWidth: '1.5' }}>
                                                                                    <path d="M3 6h18" stroke-linecap="round" />
                                                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" />
                                                                                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round" />
                                                                                    <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                                                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    generateCategoryQuestions(heading);
                                                                }}
                                                                disabled={generatingCat === heading}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    background: generatingCat === heading ? '#E9EAEB' : '#111827',
                                                                    color: generatingCat === heading ? '#667085' : '#fff',
                                                                    border: '1px solid #E9EAEB',
                                                                    padding: '8px 14px',
                                                                    borderRadius: 24,
                                                                    cursor: 'pointer',
                                                                    fontSize: 14,
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                <img src="/icons/sparklewhite.svg" alt="" width={16} height={16} />
                                                                <span>{generatingCat === heading ? 'Generating…' : 'Generate questions'}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setQuestions((list: any[]) => {
                                                                        const catName = heading === 'Behavioural' ? 'Behavioral' : heading;
                                                                        const idx = list.findIndex((c: any) => c.category === catName);
                                                                        if (idx < 0) return list;
                                                                        const cat = list[idx];
                                                                        const nextQs = [
                                                                            ...(cat.questions || []),
                                                                            { id: guid(), text: '', prompt: '' },
                                                                        ];
                                                                        return list.map((c: any, i: number) => (i === idx ? { ...c, questions: nextQs } : c));
                                                                    });
                                                                }}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 6,
                                                                    background: '#fff',
                                                                    color: '#414651',
                                                                    border: '1px solid #D5D7DA',
                                                                    padding: '8px 14px',
                                                                    borderRadius: 24,
                                                                    cursor: 'pointer',
                                                                    fontSize: 14,
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                <img src="/icons/circleplus.svg" alt="" width={16} height={16} />
                                                                <span>Manual add</span>
                                                            </button>
                                                        </div>
                                                        {(() => {
                                                            const catName = heading === 'Behavioural' ? 'Behavioral' : heading;
                                                            const cat = questions.find((c) => c.category === catName);
                                                            const count = (cat?.questions?.length || 0);
                                                            if (count <= 0) return null;
                                                            return (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#667085' }}># of questions to ask</span>
                                                                    <div
                                                                        style={{
                                                                            borderRadius: '20%',
                                                                            width: 45,
                                                                            height: 42,
                                                                            border: '1px solid #D5D9EB',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: 14,
                                                                            backgroundColor: '#F8F9FC',
                                                                            color: '#363F72',
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        {count}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div style={{ width: '100%', height: 1, background: '#E9EAEB' }} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Right column - Tips */}
                    <div style={{ width: 'min(320px, 100dvh)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: '#fff', border: '1px solid #E9EAEB', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#181D27', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img src="/icons/tips_and_updates.svg" width={20} height={20} alt="tips" />
                                <span>Tips</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#667085', lineHeight: '20px' }}>Keep intro concise and friendly—avoid jargon that early-career candidates may not understand.</div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#667085', lineHeight: '20px' }}>Choose 2–4 evaluation focus tags to keep AI scoring consistent.</div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: '#667085', lineHeight: '20px' }}>Target duration is a guideline; final transcript may vary slightly.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {currentStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 260 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>Customize pipeline stages</span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>Create, modify, reorder, and delete stages and sub-stages. Core stages are fixed and cannot be moved.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <button
                                type="button"
                                onClick={() => setPipelineStages([
                                    {
                                        id: guid(), title: 'CV Screening', core: true, icon: 'cv',
                                        substages: [
                                            { id: guid(), label: 'Waiting Submission', automated: true },
                                            { id: guid(), label: 'For Review', automated: false },
                                        ]
                                    },
                                    {
                                        id: guid(), title: 'AI Interview', core: true, icon: 'ai',
                                        substages: [
                                            { id: guid(), label: 'Waiting Interview', automated: true },
                                            { id: guid(), label: 'For Review', automated: false },
                                        ]
                                    },
                                    {
                                        id: guid(), title: 'Final Human Interview', core: true, icon: 'human',
                                        substages: [
                                            { id: guid(), label: 'Waiting Schedule', automated: true },
                                            { id: guid(), label: 'Waiting Interview', automated: false },
                                            { id: guid(), label: 'For Review', automated: false },
                                        ]
                                    },
                                    {
                                        id: guid(), title: 'Job Offer', core: true, icon: 'offer',
                                        substages: [
                                            { id: guid(), label: 'For Final Review', automated: false },
                                            { id: guid(), label: 'Waiting Offer Acceptance', automated: true },
                                            { id: guid(), label: 'For Contract Signing', automated: false },
                                            { id: guid(), label: 'Hired', automated: false },
                                        ]
                                    },
                                ])}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111827', border: '1px solid #D5D7DA', padding: '8px 12px', borderRadius: 24, cursor: 'pointer', fontWeight: 700 }}
                            >
                                <span>Restore to default</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => console.log('Copy pipeline from existing job')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#111827', border: '1px solid #D5D7DA', padding: '8px 12px', borderRadius: 24, cursor: 'pointer', fontWeight: 700 }}
                            >
                                <span>Copy pipeline from existing job</span>
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
                        {pipelineStages.map((stage) => (
                            <div key={stage.id} style={{ minWidth: 280, background: '#fff', border: '1px dashed #D5D9EB', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12, fontWeight: 600 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#667085', strokeWidth: 1.5 }}>
                                        <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2Z" />
                                        <path d="M17 9V7a5 5 0 0 0-10 0v2" />
                                    </svg>
                                    <span>Core stage, cannot move</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {stage.icon === 'ai' && (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                    <path d="M12 1v22M5 8h14M7 17h10" />
                                                </svg>
                                            )}
                                            {stage.icon === 'cv' && (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                    <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm9 0v5h5" />
                                                </svg>
                                            )}
                                            {stage.icon === 'human' && (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 9a7 7 0 0 0-14 0" />
                                                </svg>
                                            )}
                                            {stage.icon === 'offer' && (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                    <path d="M3 7h18M7 7v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>{stage.title}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.6 }}>
                                            <path d="M12 5.5v.01M12 12v.01M12 18.5v.01" />
                                        </svg>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Substages</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {stage.substages.map((ss: any) => (
                                        <div key={ss.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #EAECF5', borderRadius: 22, padding: '10px 12px', background: '#fff' }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{ss.label}</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                                                {ss.automated ? (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                                        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z" />
                                                    </svg>
                                                ) : (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.8 }}>
                                                        <path d="M9 18l6-6-6-6" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div style={{ minWidth: 80, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setPipelineStages(list => [...list, { id: guid(), title: 'New Stage', core: false, icon: 'ai', substages: [] }])}
                                style={{ width: 56, height: 56, borderRadius: 16, border: '1px solid #D5D9EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {currentStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>Career Details</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => setCurrentStep(0)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                    <button type="button" onClick={() => setRevOpenDetails(v => !v)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>{revOpenDetails ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            {revOpenDetails && (
                                <div style={{ padding: 16, border: '1px solid #EAECF5', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Job Title</div>
                                        <div style={{ fontSize: 14, color: '#667085' }}>{jobTitle || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Employment Type</div>
                                        <div style={{ fontSize: 14, color: '#667085' }}>{employmentType || '-'}</div>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Description</div>
                                        {(() => {
                                            const html = getSafeRichHtml(description);
                                            return html && html.trim().length > 0 ? (
                                                <div style={{ fontSize: 14, color: '#667085' }} dangerouslySetInnerHTML={{ __html: html }} />
                                            ) : (
                                                <div style={{ fontSize: 14, color: '#667085' }}>-</div>
                                            );
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Work Setup</div>
                                        <div style={{ fontSize: 14, color: '#667085' }}>{workSetup || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Location</div>
                                        <div style={{ fontSize: 14, color: '#667085' }}>{[country, province, city].filter(Boolean).join(', ') || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Salary</div>
                                        <div style={{ fontSize: 14, color: '#667085' }}>{salaryNegotiable ? 'Negotiable' : `${minimumSalary || '-'} - ${maximumSalary || '-'}`}</div>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Team Access</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {teamMembers.length ? teamMembers.map(m => {
                                                const org = allOrgMembers.find((x) => x.email === m.email) || {} as any;
                                                const avatar = org.image || (user?.email === m.email ? user?.image : null);
                                                const displayName = org.name || (m.email === user?.email ? (user?.name || m.email) : (org.name || m.email));
                                                return (
                                                    <div key={m.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #E9EAEB', borderRadius: 8, padding: '8px 12px', background: '#FFFFFF' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                                            {avatar ? (
                                                                <img src={avatar} alt={m.email} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#181D27' }}>{getInitials(displayName)}</div>
                                                            )}
                                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 600, color: '#181D27', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                                                                <span style={{ fontSize: 12, fontWeight: 500, color: '#717680', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#181D27', border: '1px solid #E9EAEB', borderRadius: 16, padding: '4px 10px', background: '#F8F9FC' }}>{m.role}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }) : <span style={{ fontSize: 14, color: '#667085' }}>None</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>CV Review</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => setCurrentStep(1)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                    <button type="button" onClick={() => setRevOpenCV(v => !v)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>{revOpenCV ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            {revOpenCV && (
                                <div style={{ padding: 16, border: '1px solid #EAECF5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Screening Setting</div>
                                            <div style={{ fontSize: 14, color: '#667085' }}>{screeningSetting}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Require Video</div>
                                            <div style={{ fontSize: 14, color: '#667085' }}>{requireVideo ? 'Yes' : 'No'}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>CV Secret Prompt</div>
                                        <div style={{ fontSize: 14, color: '#667085', whiteSpace: 'pre-wrap' }}>{cvSecretPrompt || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Pre-screening Questions</span>
                                            <div style={{ borderRadius: '50%', width: 26, height: 22, border: '1px solid #D5D9EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, backgroundColor: '#F8F9FC', color: '#363F72', fontWeight: 700 }}>
                                                {preScreeningQuestions.length}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {preScreeningQuestions.length ? preScreeningQuestions.map((q) => (
                                                <div key={q.id} style={{ border: '1px solid #E9EAEB', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#181D27' }}>{q.prompt}</span>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#667085' }}>{q.answerType}</span>
                                                    </div>
                                                    {(q.options && q.options.length > 0) && (
                                                        <ul style={{ margin: 0, paddingLeft: 18, color: '#667085', fontSize: 13 }}>
                                                            {q.options.map((o) => (
                                                                <li key={o.id}>{o.text}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )) : <span style={{ fontSize: 14, color: '#667085' }}>None</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>AI Setup</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => setCurrentStep(2)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                    <button type="button" onClick={() => setRevOpenAI(v => !v)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>{revOpenAI ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            {revOpenAI && (
                                <div style={{ padding: 16, border: '1px solid #EAECF5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Language</div>
                                            <div style={{ fontSize: 14, color: '#667085' }}>{aiLanguage}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>AI Interview Secret Prompt</div>
                                        <div style={{ fontSize: 14, color: '#667085', whiteSpace: 'pre-wrap' }}>{secretPrompt || '-'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>Interview Questions</div>
                                            <div style={{ borderRadius: '50%', width: 26, height: 22, border: '1px solid #D5D9EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, backgroundColor: '#F8F9FC', color: '#363F72', fontWeight: 700 }}>
                                                {questions.reduce((sum, cat) => sum + ((cat?.questions || []).filter((q: any) => String(q.text ?? q.prompt ?? '').trim().length > 0).length), 0)}
                                            </div>
                                        </div>
                                        {['CV Validation / Experience', 'Technical', 'Behavioural', 'Analytical', 'Others'].map((heading) => {
                                            const catName = heading === 'Behavioural' ? 'Behavioral' : heading;
                                            const cat = questions.find((c) => c.category === catName);
                                            const items = (cat?.questions || []).filter((q: any) => String(q.text ?? q.prompt ?? '').trim().length > 0);
                                            return (
                                                <div key={heading} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{heading}</span>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#667085' }}>{items.length}</span>
                                                    </div>
                                                    {items.length > 0 && (
                                                        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            {items.map((q: any) => (
                                                                <li key={q.id} style={{ fontSize: 14, color: '#181D27' }}>{q.text || q.prompt}</li>
                                                            ))}
                                                        </ol>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>Pipeline</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" onClick={() => setCurrentStep(3)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                    <button type="button" onClick={() => setRevOpenPipeline(v => !v)} style={{ background: '#fff', border: '1px solid #D5D7DA', borderRadius: 24, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>{revOpenPipeline ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            {revOpenPipeline && (
                                <div style={{ padding: 16, border: '1px solid #EAECF5', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
                                        {pipelineStages.map((stage) => (
                                            <div key={stage.id} style={{ minWidth: 280, background: '#fff', border: '1px dashed #D5D9EB', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12, fontWeight: 600 }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#667085', strokeWidth: 1.5 }}>
                                                        <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2Z" />
                                                        <path d="M17 9V7a5 5 0 0 0-10 0v2" />
                                                    </svg>
                                                    <span>Core stage, cannot move</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {stage.icon === 'ai' && (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                                    <path d="M12 1v22M5 8h14M7 17h10" />
                                                                </svg>
                                                            )}
                                                            {stage.icon === 'cv' && (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                                    <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm9 0v5h5" />
                                                                </svg>
                                                            )}
                                                            {stage.icon === 'human' && (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm7 9a7 7 0 0 0-14 0" />
                                                                </svg>
                                                            )}
                                                            {stage.icon === 'offer' && (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.6 }}>
                                                                    <path d="M3 7h18M7 7v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: 16, fontWeight: 700, color: '#181D27' }}>{stage.title}</span>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Substages</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {stage.substages.map((ss: any) => (
                                                        <div key={ss.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #EAECF5', borderRadius: 22, padding: '10px 12px', background: '#fff' }}>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#181D27' }}>{ss.label}</span>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #EAECF5', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                                                                {ss.automated ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#111827', strokeWidth: 1.8 }}>
                                                                        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ stroke: '#98A2B3', strokeWidth: 1.8 }}>
                                                                        <path d="M9 18l6-6-6-6" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
