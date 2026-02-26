import React, { useState, useMemo } from 'react';
import { BookOpen, Search, ChevronRight, ExternalLink, ChevronDown, Lightbulb, AlertTriangle, CheckCircle2, ZoomIn, ArrowLeft, ArrowRight, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import helpContent from '../data/helpContent';

const tipStyles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-700', icon: Lightbulb, iconColor: 'text-blue-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-700', icon: AlertTriangle, iconColor: 'text-amber-500' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', icon: CheckCircle2, iconColor: 'text-emerald-500' },
};

const FaqItem = ({ question, answer }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
                <span className="text-sm font-semibold text-slate-700 pr-4 leading-snug">{question}</span>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500 leading-relaxed pt-3">{answer}</p>
                </div>
            )}
        </div>
    );
};

/* ───────── Section Detail View ───────── */
const SectionDetail = ({ section, onBack }) => {
    return (
        <div className="animate-fade-in">
            {/* Back + Breadcrumb */}
            <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Tüm Bölümler
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <section.icon size={26} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{section.title}</h1>
                    <p className="text-sm text-slate-400 mt-1">{section.description}</p>
                </div>
                {section.link && (
                    <Link
                        to={section.link}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors shrink-0 self-start"
                    >
                        <ExternalLink size={14} />
                        Sayfaya Git
                        <ArrowRight size={14} />
                    </Link>
                )}
            </div>

            <div className="space-y-10">
                {/* Screenshots */}
                {section.images?.length > 0 && (
                    <div>
                        <SectionHeading>Ekran Görüntüleri</SectionHeading>
                        <div className="grid gap-4">
                            {section.images.map((img, i) => (
                                <div key={i} className="group rounded-xl border border-slate-200/80 overflow-hidden bg-white hover:shadow-lg transition-shadow">
                                    <a href={img.src} target="_blank" rel="noopener noreferrer" className="block relative">
                                        <img src={img.src} alt={img.caption} className="w-full h-auto" loading="lazy" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg">
                                                <ZoomIn size={18} className="text-slate-600" />
                                            </div>
                                        </div>
                                    </a>
                                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium">{img.caption}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Steps */}
                {section.steps?.length > 0 && (
                    <div>
                        <SectionHeading>Nasıl Yapılır</SectionHeading>
                        <div className="space-y-3">
                            {section.steps.map((step, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center pt-0.5">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-indigo-100 group-hover:border-indigo-300 transition-colors">
                                            {i + 1}
                                        </div>
                                        {i < section.steps.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-indigo-100 mt-1.5" />
                                        )}
                                    </div>
                                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex-1 hover:shadow-sm transition-shadow mb-1">
                                        <h3 className="text-sm font-bold text-slate-700 mb-1">{step.title}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tips */}
                {section.tips?.length > 0 && (
                    <div>
                        <SectionHeading>İpuçları</SectionHeading>
                        <div className="space-y-3">
                            {section.tips.map((tip, i) => {
                                const style = tipStyles[tip.type] || tipStyles.info;
                                const TipIcon = style.icon;
                                return (
                                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}>
                                        <TipIcon size={18} className={`${style.iconColor} shrink-0 mt-0.5`} />
                                        <p className={`text-sm leading-relaxed ${style.text}`}>{tip.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FAQ */}
                {section.faq?.length > 0 && (
                    <div>
                        <SectionHeading>Sıkça Sorulan Sorular</SectionHeading>
                        <div className="space-y-2">
                            {section.faq.map((item, i) => (
                                <FaqItem key={i} question={item.q} answer={item.a} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SectionHeading = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
        <Hash size={14} className="text-slate-300" />
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</h2>
    </div>
);

/* ───────── Main Component ───────── */
const HelpLibrary = () => {
    const { hasPermission } = useAuth();
    const [activeSection, setActiveSection] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const sections = useMemo(() => {
        return helpContent.filter(section => {
            if (!section.permission) return true;
            if (Array.isArray(section.permission)) {
                return section.permission.some(p => hasPermission(p));
            }
            return hasPermission(section.permission);
        });
    }, [hasPermission]);

    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase();
        return sections.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.steps?.some(step => step.title.toLowerCase().includes(q) || step.description.toLowerCase().includes(q)) ||
            s.faq?.some(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
        );
    }, [sections, searchQuery]);

    const currentSection = filteredSections.find(s => s.id === activeSection);

    const handleSectionClick = (id) => {
        setActiveSection(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setActiveSection(null);
    };

    /* ───── Detail View ───── */
    if (currentSection) {
        return (
            <div className="max-w-4xl mx-auto">
                <SectionDetail section={currentSection} onBack={handleBack} />
            </div>
        );
    }

    /* ───── Grid / Overview ───── */
    return (
        <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Yardım Rehberi</h1>
                        <p className="text-sm text-slate-400">{sections.length} bölüm</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-8 max-w-lg">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Bölüm veya konu ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all"
                />
            </div>

            {/* Section Cards Grid */}
            {filteredSections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredSections.map(section => {
                        const Icon = section.icon;
                        const statCount = (section.steps?.length || 0) + (section.faq?.length || 0) + (section.tips?.length || 0);
                        return (
                            <button
                                key={section.id}
                                onClick={() => handleSectionClick(section.id)}
                                className="group text-left bg-white border border-slate-200/80 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <Icon size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors truncate">
                                                {section.title}
                                            </h3>
                                            <ChevronRight size={14} className="text-slate-300 shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                            {section.description}
                                        </p>
                                        <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                                            {section.steps?.length > 0 && (
                                                <span>{section.steps.length} adım</span>
                                            )}
                                            {section.faq?.length > 0 && (
                                                <span>{section.faq.length} SSS</span>
                                            )}
                                            {section.images?.length > 0 && (
                                                <span>{section.images.length} görsel</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 text-slate-400">
                    <Search size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Sonuç bulunamadı</p>
                    <p className="text-xs mt-1">Farklı bir arama terimi deneyin</p>
                </div>
            )}
        </div>
    );
};

export default HelpLibrary;
