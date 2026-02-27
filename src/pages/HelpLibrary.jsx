import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Search, ChevronRight, ExternalLink, ChevronDown, Lightbulb, AlertTriangle, CheckCircle2, ZoomIn, ArrowRight, Hash, X } from 'lucide-react';
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

const SectionHeading = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
        <Hash size={14} className="text-slate-300" />
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</h2>
    </div>
);

const HelpLibrary = () => {
    const { hasPermission } = useAuth();
    const [activeSection, setActiveSection] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const contentRef = useRef(null);

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

    useEffect(() => {
        if (filteredSections.length > 0 && !activeSection) {
            setActiveSection(filteredSections[0].id);
        }
    }, [filteredSections]);

    const currentSection = filteredSections.find(s => s.id === activeSection);

    const handleSectionClick = (id) => {
        setActiveSection(id);
        setMobileSidebarOpen(false);
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex -m-4 md:-m-8 h-[calc(100vh-5rem)]">
            {/* Mobile toggle */}
            <button
                className="md:hidden fixed bottom-6 right-6 z-50 p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/30"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
                <BookOpen size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileSidebarOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            )}

            {/* Image Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 md:p-12 cursor-pointer"
                    onClick={() => setLightboxImage(null)}
                >
                    <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10">
                        <X size={22} className="text-white" />
                    </button>
                    <img
                        src={lightboxImage.src}
                        alt={lightboxImage.caption}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm max-w-lg text-center">
                        {lightboxImage.caption}
                    </p>
                </div>
            )}

            {/* Sidebar */}
            <div className={`
                ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 fixed md:static z-50 md:z-auto
                w-64 h-full bg-white border-r border-slate-200/60
                flex flex-col shrink-0 transition-transform duration-300
                shadow-lg md:shadow-none
            `}>
                {/* Sidebar header */}
                <div className="px-3 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                <BookOpen size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800 leading-tight">Yardım Rehberi</h2>
                                <p className="text-[10px] text-slate-400 font-medium">{filteredSections.length} bölüm</p>
                            </div>
                        </div>
                        <button className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg" onClick={() => setMobileSidebarOpen(false)}>
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all"
                        />
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto px-1.5 pb-4 space-y-0.5">
                    {filteredSections.map(section => {
                        const isActive = section.id === activeSection;
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => handleSectionClick(section.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-400 group-hover:text-slate-500'
                                }`}>
                                    <Icon size={14} />
                                </div>
                                <span className={`text-[13px] font-medium truncate ${
                                    isActive ? 'text-indigo-700' : 'text-slate-600'
                                }`}>
                                    {section.title}
                                </span>
                                {isActive && (
                                    <ChevronRight size={12} className="text-indigo-400 shrink-0 ml-auto" />
                                )}
                            </button>
                        );
                    })}

                    {filteredSections.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Search size={24} className="mx-auto mb-2 opacity-30" />
                            <p className="text-xs font-medium">Sonuç bulunamadı</p>
                        </div>
                    )}
                </nav>
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto">
                {currentSection ? (
                    <div className="max-w-4xl mx-auto p-6 md:p-8">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                <currentSection.icon size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">{currentSection.title}</h1>
                                <p className="text-sm text-slate-400 mt-0.5">{currentSection.description}</p>
                            </div>
                            {currentSection.link && (
                                <Link
                                    to={currentSection.link}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors shrink-0 self-start"
                                >
                                    <ExternalLink size={14} />
                                    Sayfaya Git
                                    <ArrowRight size={14} />
                                </Link>
                            )}
                        </div>

                        <div className="space-y-10">
                            {/* Screenshots */}
                            {currentSection.images?.length > 0 && (
                                <div>
                                    <SectionHeading>Ekran Görüntüleri</SectionHeading>
                                    <div className={`grid gap-3 ${currentSection.images.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2 md:grid-cols-3'}`}>
                                        {currentSection.images.map((img, i) => (
                                            <div
                                                key={i}
                                                className="group rounded-xl border border-slate-200/80 overflow-hidden bg-white cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all duration-200"
                                                onClick={() => setLightboxImage(img)}
                                            >
                                                <div className="relative aspect-video">
                                                    <img src={img.src} alt={img.caption} className="w-full h-full object-cover object-top" loading="lazy" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-1">
                                                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                                                <ZoomIn size={16} className="text-slate-600" />
                                                            </div>
                                                            <span className="text-white text-[11px] font-medium drop-shadow">Büyüt</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                                                    <p className="text-[11px] text-slate-500 font-medium leading-snug line-clamp-2">{img.caption}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Steps */}
                            {currentSection.steps?.length > 0 && (
                                <div>
                                    <SectionHeading>Nasıl Yapılır</SectionHeading>
                                    <div className="space-y-3">
                                        {currentSection.steps.map((step, i) => (
                                            <div key={i} className="flex gap-4 group">
                                                <div className="flex flex-col items-center pt-0.5">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-indigo-100 group-hover:border-indigo-300 transition-colors">
                                                        {i + 1}
                                                    </div>
                                                    {i < currentSection.steps.length - 1 && (
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
                            {currentSection.tips?.length > 0 && (
                                <div>
                                    <SectionHeading>İpuçları</SectionHeading>
                                    <div className="space-y-3">
                                        {currentSection.tips.map((tip, i) => {
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
                            {currentSection.faq?.length > 0 && (
                                <div>
                                    <SectionHeading>Sıkça Sorulan Sorular</SectionHeading>
                                    <div className="space-y-2">
                                        {currentSection.faq.map((item, i) => (
                                            <FaqItem key={i} question={item.q} answer={item.a} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                        <BookOpen size={48} className="mb-3" />
                        <p className="text-sm font-medium">Bir bölüm seçin</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HelpLibrary;
