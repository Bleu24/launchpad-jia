"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "@/lib/context/AppContext";
import philippineLocations from "../../../../public/philippines-locations.json";
import CustomDropdown from "./CustomDropdown";
import RichTextEditor from "./RichTextEditor";
import axios from "axios";
import { candidateActionToast, errorToast } from "@/lib/Utils";

type TeamMember = { email: string; role: "Job Owner" | "Collaborator" };

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

const defaultQuestions = [
    { id: 1, category: "CV Validation / Experience", questionCountToAsk: null, questions: [] },
    { id: 2, category: "Technical", questionCountToAsk: null, questions: [] },
    { id: 3, category: "Behavioral", questionCountToAsk: null, questions: [] },
    { id: 4, category: "Analytical", questionCountToAsk: null, questions: [] },
    { id: 5, category: "Others", questionCountToAsk: null, questions: [] },
];

export default function NewCareerWizard() {
    const { user, orgID } = useAppContext();
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
    const [screeningSetting, setScreeningSetting] = useState("Good Fit and above");
    const [requireVideo, setRequireVideo] = useState(true);
    const [salaryNegotiable, setSalaryNegotiable] = useState(true);
    const [minimumSalary, setMinimumSalary] = useState<string | number>("");
    const [maximumSalary, setMaximumSalary] = useState<string | number>("");
    const [country, setCountry] = useState("Philippines");
    const [province, setProvince] = useState("");
    const [city, setCity] = useState("");
    const [provinceList, setProvinceList] = useState<any[]>([]);
    const [cityList, setCityList] = useState<any[]>([]);

    // Team access (visual only for now)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("Collaborator");
    const [memberPickerOpen, setMemberPickerOpen] = useState(false);
    const [allOrgMembers, setAllOrgMembers] = useState<any[]>([]);
    const [memberSearch, setMemberSearch] = useState("");

    // Internal flags
    const [submitting, setSubmitting] = useState(false);
    const submittedRef = useRef(false);

    useEffect(() => {
        // Initialize locations with provinces and full city list (no preselection)
        const provinces = philippineLocations.provinces as any[];
        setProvinceList(provinces);
        // Default: show placeholder for province and city, but allow city dropdown to list all cities when opened
        setProvince("");
        setCityList(philippineLocations.cities as any[]);
        setCity("");
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
            workSetup.trim().length > 0 &&
            province.trim().length > 0 &&
            city.trim().length > 0
        );
    }, [jobTitle, description, workSetup, province, city]);

    const addMember = (email: string, role: TeamMember['role'] = 'Collaborator') => {
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
            const payload = {
                jobTitle,
                description,
                workSetup,
                workSetupRemarks,
                questions: defaultQuestions,
                lastEditedBy: userInfo,
                createdBy: userInfo,
                screeningSetting: "Good Fit and above",
                orgID,
                requireVideo: true,
                salaryNegotiable,
                minimumSalary: isNaN(Number(minimumSalary)) ? null : Number(minimumSalary),
                maximumSalary: isNaN(Number(maximumSalary)) ? null : Number(maximumSalary),
                country,
                province,
                location: city,
                status,
                employmentType,
            };

            const res = await axios.post("/api/add-career", payload);
            if (res.status === 200) {
                candidateActionToast(
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#181D27" }}>Career saved</span>
                    </div>,
                    1300,
                    <i className="la la-check-circle" style={{ color: "#039855", fontSize: 32 }}></i>
                );
                setTimeout(() => {
                    // Go back to list for now; we can wire step continuation later
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

    return (
        <div className="col">
            <style>{`
                .nwz-input::placeholder { font-family: 'Satoshi', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight:500; font-size:16px; color:#717680; }
                .nwz-inline-salary { display:flex; align-items:center; gap:8px; }
                .nwz-salary-wrapper { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                .nwz-salary-box { display:flex; align-items:center; gap:8px; border:1px solid #E9EAEB; border-radius:8px; padding:10px 14px; background:#fff; }
                .nwz-salary-box span.symbol, .nwz-salary-box span.ccy { font-size:16px; color:#717680; font-weight:500; }
                .nwz-salary-box input { border:none; outline:none; width:100%; font-size:16px; color:#181D27; padding:0; box-shadow:none; background:transparent; }
                .nwz-salary-box input::placeholder { font-family:'Satoshi'; font-weight:500; font-size:16px; color:#717680; }
            `}</style>
            {/* Header row */}
            <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 550, color: "#111827" }}>Add new career</h1>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        disabled={!canProceedStep1 || submitting}
                        style={{ width: "fit-content", color: "#414651", background: "#fff", border: "1px solid #D5D7DA", padding: "8px 16px", borderRadius: 60, cursor: !canProceedStep1 || submitting ? "not-allowed" : "pointer" }}
                        onClick={() => handleSave("inactive")}
                    >
                        Save as Unpublished
                    </button>
                    <button
                        disabled={!canProceedStep1 || submitting}
                        style={{ width: "fit-content", background: !canProceedStep1 || submitting ? "#D5D7DA" : "black", color: "#fff", border: "1px solid #E9EAEB", padding: "8px 16px", borderRadius: 60, cursor: !canProceedStep1 || submitting ? "not-allowed" : "pointer" }}
                        onClick={() => handleSave("inactive")}
                    >
                        <i className="la la-check-circle" style={{ color: "#fff", fontSize: 20, marginRight: 8 }}></i>
                        Save and Continue
                    </button>
                </div>
            </div>

            {/* Stepper - flat, horizontal, each item is a vertical box with progress + text */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16, overflowX: "auto" }}>
                {steps.map((label, idx) => {
                    const isActive = idx === currentStep;
                    // icon uses provided SVG; only its fill toggles
                    const lineColor = "#E9EAEB"; // line stays gray regardless of active state
                    const textColor = isActive ? "#111827" : "#717680"; // label turns black when active, gray otherwise
                    return (
                        <div key={label} style={{ width: "max(242px, 20vw)" }}>
                            {/* progress container */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <StepIcon active={isActive} />
                                </div>
                                <div style={{ flex: 1, height: 2, background: lineColor }} />
                            </div>
                            {/* text group */}
                            <div style={{ marginTop: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Divider below stepper */}
            <div style={{ width: "100%", height: 1, background: "#EAECF5", marginBottom: 24 }}></div>

            {/* Form grid */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                {/* Left column */}
                <div style={{ width: "60%", display: "flex", flexDirection: "column", gap: 24 }}>
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
                                        <input
                                            className="form-control nwz-input"
                                            style={{ padding: "10px 14px" }}
                                            placeholder="Enter job title"
                                            value={jobTitle}
                                            onChange={(e) => setJobTitle(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Work Setting */}
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#181D27", marginBottom: 8 }}>Work Setting</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Employment Type</div>
                                            <CustomDropdown
                                                onSelectSetting={(v) => setEmploymentType(v)}
                                                screeningSetting={employmentType}
                                                settingList={employmentTypeOptions}
                                                placeholder="Choose Employment type"
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Arrangement</div>
                                            <CustomDropdown
                                                onSelectSetting={(v) => setWorkSetup(v)}
                                                screeningSetting={workSetup}
                                                settingList={workSetupOptions}
                                                placeholder="Choose work arrangement"
                                            />
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
                                            <CustomDropdown
                                                onSelectSetting={(prov) => {
                                                    setProvince(prov);
                                                    const provinceObj = provinceList.find((p) => p.name === prov);
                                                    const cities = (philippineLocations.cities as any[]).filter((c: any) => c.province === provinceObj.key);
                                                    setCityList(cities);
                                                    // Reset city so placeholder displays until user selects a city
                                                    setCity("");
                                                }}
                                                screeningSetting={province}
                                                settingList={provinceList}
                                                placeholder="Choose state / province"
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>City</div>
                                            <CustomDropdown
                                                onSelectSetting={(ct) => setCity(ct)}
                                                screeningSetting={city}
                                                settingList={cityList}
                                                placeholder="Choose city"
                                            />
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
                                            <div className="nwz-salary-box">
                                                <span className="symbol">₱</span>
                                                <input type="number" placeholder="0" min={0} value={minimumSalary as any} onChange={(e) => setMinimumSalary(e.target.value || "")} />
                                                <span className="ccy">PHP</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, color: "#667085", marginBottom: 6 }}>Maximum Salary</div>
                                            <div className="nwz-salary-box">
                                                <span className="symbol">₱</span>
                                                <input type="number" placeholder="0" min={0} value={maximumSalary as any} onChange={(e) => setMaximumSalary(e.target.value || "")} />
                                                <span className="ccy">PHP</span>
                                            </div>
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
                            <div style={{ padding: 24, border: "1px solid #EAECF5", borderRadius: 8 }}>
                                <RichTextEditor text={description} setText={setDescription} />
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
                                                                    onClick={() => { addMember(m.email, 'Collaborator'); setMemberPickerOpen(false); setMemberSearch(''); }}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ minWidth: 220 }}>
                                                    <CustomDropdown
                                                        onSelectSetting={(role) => updateMemberRole(m.email, role as TeamMember['role'])}
                                                        screeningSetting={m.role}
                                                        settingList={[{ name: 'Job Owner' }, { name: 'Collaborator' }]}
                                                        placeholder="Role"
                                                    />
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

                {/* Right column */}
                <div style={{ width: "40%", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ background: "#fff", border: "1px solid #E9EAEB", borderRadius: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 32, height: 32, backgroundColor: "#181D27", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <i className="la la-ellipsis-h" style={{ color: "#FFFFFF", fontSize: 20 }}></i>
                            </div>
                            <span style={{ fontSize: 16, color: "#181D27", fontWeight: 700 }}>Settings</span>
                        </div>
                        <div style={{ padding: 16 }}>
                            {/* Keep only settings-related controls here for now */}
                            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <i className="la la-id-badge" style={{ color: "#414651", fontSize: 20 }}></i>
                                    <span>Screening Setting</span>
                                </div>
                            </div>
                            <CustomDropdown
                                onSelectSetting={(setting) => {
                                    setScreeningSetting(setting);
                                }}
                                screeningSetting={screeningSetting}
                                settingList={[{ name: "Good Fit and above" }, { name: "Only Strong Fit" }, { name: "No Automatic Promotion" }]}
                            />
                            <span style={{ fontSize: 12, color: "#667085" }}>This setting allows Jia to automatically endorse candidates who meet the chosen criteria.</span>

                            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <i className="la la-video" style={{ color: "#414651", fontSize: 20 }}></i>
                                    <span>Require Video Interview</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <label className="switch">
                                        <input type="checkbox" checked={requireVideo} onChange={() => setRequireVideo(!requireVideo)} />
                                        <span className="slider round"></span>
                                    </label>
                                    <span>{requireVideo ? "Yes" : "No"}</span>
                                </div>
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, color: "#667085", marginBottom: 6 }}>Work Setup Remarks</div>
                                <input
                                    className="form-control nwz-input"
                                    style={{ padding: "10px 14px" }}
                                    placeholder="Additional remarks about work setup (optional)"
                                    value={workSetupRemarks}
                                    onChange={(e) => setWorkSetupRemarks(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
