import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Search, ChevronRight, ExternalLink, ChevronDown, Lightbulb, AlertTriangle, CheckCircle2, X, ZoomIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import helpContent from '../data/helpContent';

const tipStyles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Lightbulb, iconColor: 'text-blue-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle, iconColor: 'text-amber-500' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, iconColor: 'text-emerald-500' },
};

const FaqItem = ({ question, answer }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/80 transition-colors"
            >
                <span className="text-xs font-semibold text-slate-700 pr-4">{question}</span>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0">
                    <p className="text-xs text-slate-500 leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
};

const HelpLibrary = () => {
    const { hasPermission } = useAuth();
    const [activeSection, setActiveSection] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
        const hash = window.location.hash.replace('#', '');
        if (hash && filteredSections.find(s => s.id === hash)) {
            setActiveSection(hash);
        } else if (filteredSections.length > 0 && !activeSection) {
            setActiveSection(filteredSections[0].id);
        }
    }, [filteredSections]);

    const currentSection = filteredSections.find(s => s.id === activeSection);

    const handleSectionClick = (id) => {
        setActiveSection(id);
        setMobileSidebarOpen(false);
        window.history.replaceState(null, '', `#${id}`);
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex h-[calc(100vh-80px)] overflow-hidden -m-5">
            {/* Mobile sidebar toggle */}
            <button
                className="md:hidden fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl shadow-xl shadow-indigo-500/30"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
                <BookOpen size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileSidebarOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            )}

            {/* Left Sidebar */}
            <aside className={`
                ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 fixed md:static z-50 md:z-auto
                w-[300px] h-full bg-white border-r border-slate-100
                flex flex-col transition-transform duration-300 ease-out
                shadow-xl md:shadow-none
            `}>
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                                <BookOpen size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Yardım Rehberi</h2>
                                <p className="text-[10px] text-slate-400 font-medium">{filteredSections.length} bölüm</p>
                            </div>
                        </div>
                        <button className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg" onClick={() => setMobileSidebarOpen(false)}>
                            <X size={16} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Bölüm ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-300 transition-all"
                        />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredSections.map(section => {
                        const isActive = section.id === activeSection;
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => handleSectionClick(section.id)}
                                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group ${
                                    isActive
                                        ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm'
                                        : 'hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                                    isActive
                                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-500'
                                }`}>
                                    <Icon size={14} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>
                                        {section.title}
                                    </p>
                                    <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                                        {section.description}
                                    </p>
                                </div>
                                {isActive && (
                                    <ChevronRight size={12} className="text-indigo-400 shrink-0 ml-auto" />
                                )}
                            </button>
                        );
                    })}

                    {filteredSections.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Search size={24} className="mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Sonuç bulunamadı</p>
                        </div>
                    )}
                </nav>
            </aside>

            {/* Right Content */}
            <main ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50/30">
                {currentSection ? (
                    <div className="max-w-3xl mx-auto p-6 md:p-10">
                        {/* Section Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                                    <currentSection.icon size={22} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{currentSection.title}</h1>
                                    <p className="text-sm text-slate-400 mt-0.5">{currentSection.description}</p>
                                </div>
                            </div>
                            {currentSection.link && (
                                <Link
                                    to={currentSection.link}
                                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <ExternalLink size={12} />
                                    Bu sayfaya git
                                </Link>
                            )}
                        </div>

                        {/* Images */}
                        {currentSection.images?.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Ekran Görüntüleri</h2>
                                <div className="space-y-4">
                                    {currentSection.images.map((img, i) => (
                                        <div key={i} className="group rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
                                            <a href={img.src} target="_blank" rel="noopener noreferrer" className="block relative">
                                                <img
                                                    src={img.src}
                                                    alt={img.caption}
                                                    className="w-full h-auto"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
                                                        <ZoomIn size={18} className="text-slate-600" />
                                                    </div>
                                                </div>
                                            </a>
                                            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                                                <p className="text-[11px] text-slate-500 font-medium">{img.caption}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Steps */}
                        {currentSection.steps?.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Nasıl Yapılır</h2>
                                <div className="space-y-4">
                                    {currentSection.steps.map((step, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-200 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-colors">
                                                    {i + 1}
                                                </div>
                                                {i < currentSection.steps.length - 1 && (
                                                    <div className="w-0.5 flex-1 bg-indigo-100 mt-2" />
                                                )}
                                            </div>
                                            <div className="bg-white rounded-xl border border-slate-100 p-4 flex-1 shadow-sm hover:shadow-md transition-shadow mb-1">
                                                <h3 className="text-sm font-bold text-slate-700 mb-1.5">{step.title}</h3>
                                                <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tips */}
                        {currentSection.tips?.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">İpuçları</h2>
                                <div className="space-y-3">
                                    {currentSection.tips.map((tip, i) => {
                                        const style = tipStyles[tip.type] || tipStyles.info;
                                        const TipIcon = style.icon;
                                        return (
                                            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}>
                                                <TipIcon size={16} className={`${style.iconColor} shrink-0 mt-0.5`} />
                                                <p className={`text-xs leading-relaxed font-medium ${style.text}`}>{tip.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* FAQ */}
                        {currentSection.faq?.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Sıkça Sorulan Sorular</h2>
                                <div className="space-y-3">
                                    {currentSection.faq.map((item, i) => (
                                        <FaqItem key={i} question={item.q} answer={item.a} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                        <BookOpen size={48} className="mb-3" />
                        <p className="text-sm font-medium">Bir bölüm seçin</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default HelpLibrary;
