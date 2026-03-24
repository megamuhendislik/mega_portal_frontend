import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BookOpen, Search, ChevronRight, ExternalLink, ChevronDown, Lightbulb, AlertTriangle, CheckCircle2, ZoomIn, ArrowRight, Hash, X, Star } from 'lucide-react';
import ModalOverlay from '../components/ui/ModalOverlay';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import helpContent from '../data/helpContent';

const tipStyles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200/60', text: 'text-blue-700', icon: Lightbulb, iconColor: 'text-blue-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-700', icon: AlertTriangle, iconColor: 'text-amber-500' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', icon: CheckCircle2, iconColor: 'text-emerald-500' },
};

const FaqItem = ({ question, answer, highlightFn }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
                <span className="text-sm font-semibold text-slate-700 pr-4 leading-snug">{highlightFn ? highlightFn(question) : question}</span>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500 leading-relaxed pt-3">{highlightFn ? highlightFn(answer) : answer}</p>
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
    const [lightboxVisible, setLightboxVisible] = useState(false);
    const contentRef = useRef(null);

    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('help_favorites') || '[]');
        } catch { return []; }
    });

    const toggleFavorite = (sectionId, e) => {
        e.stopPropagation();
        setFavorites(prev => {
            const next = prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId];
            localStorage.setItem('help_favorites', JSON.stringify(next));
            return next;
        });
    };

    const highlightText = (text, query) => {
        if (!query || query.length < 2) return text;
        try {
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
            return parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <mark key={i} className="bg-yellow-200/80 rounded px-0.5">{part}</mark>
                    : part
            );
        } catch { return text; }
    };

    const hl = (text) => highlightText(text, searchQuery);

    const openLightbox = (img) => {
        setLightboxImage(img);
        requestAnimationFrame(() => setLightboxVisible(true));
    };

    const closeLightbox = () => {
        setLightboxVisible(false);
        setTimeout(() => setLightboxImage(null), 300);
    };

    // hover artık lightbox açmıyor — sadece tıklama ile açılır
    // Escape key handled by ModalOverlay

    const checkPerm = (perm) => {
        if (!perm) return true;
        if (Array.isArray(perm)) return perm.some(p => hasPermission(p));
        return hasPermission(perm);
    };

    const sections = useMemo(() => {
        return helpContent.filter(section => checkPerm(section.permission));
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

    const rawSection = filteredSections.find(s => s.id === activeSection);
    const currentSection = useMemo(() => {
        if (!rawSection) return null;
        return {
            ...rawSection,
            images: rawSection.images?.filter(item => checkPerm(item.permission)),
            steps: rawSection.steps?.filter(item => checkPerm(item.permission)),
            tips: rawSection.tips?.filter(item => checkPerm(item.permission)),
            faq: rawSection.faq?.filter(item => checkPerm(item.permission)),
        };
    }, [rawSection, hasPermission]);

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
            <ModalOverlay open={!!lightboxImage} onClose={closeLightbox} className="!bg-black/85 cursor-pointer p-6 md:p-12">
                {lightboxImage && (
                    <>
                        <button
                            className={`absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 z-10 ${
                                lightboxVisible ? 'opacity-100' : 'opacity-0'
                            }`}
                            onClick={closeLightbox}
                        >
                            <X size={22} className="text-white" />
                        </button>
                        <img
                            src={lightboxImage.src}
                            alt={lightboxImage.caption}
                            className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-all duration-300 ease-out ${
                                lightboxVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                            }`}
                        />
                        <p className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm max-w-lg text-center transition-all duration-300 delay-100 ${
                            lightboxVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}>
                            {lightboxImage.caption}
                        </p>
                    </>
                )}
            </ModalOverlay>

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
                                <p className="text-[10px] text-slate-400 font-medium">{searchQuery.trim() ? `${filteredSections.length} / ${sections.length} bölüm` : `${filteredSections.length} bölüm`}</p>
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
                            placeholder="Yardım konularında ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50/80 border border-slate-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    {searchQuery.trim().length >= 2 && (
                        <p className="text-[10px] text-slate-400 mt-1.5 px-1">{filteredSections.length} bölüm bulundu</p>
                    )}
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto px-1.5 pb-4 space-y-0.5">
                    {/* Favorilerim grubu */}
                    {(() => {
                        const favSections = filteredSections.filter(s => favorites.includes(s.id));
                        if (favSections.length === 0) return null;
                        return (
                            <>
                                <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Favorilerim</span>
                                </div>
                                {favSections.map(section => {
                                    const isActive = section.id === activeSection;
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={`fav-${section.id}`}
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
                                            <span className={`text-[13px] font-medium truncate flex-1 ${
                                                isActive ? 'text-indigo-700' : 'text-slate-600'
                                            }`}>
                                                {searchQuery.trim() ? hl(section.title) : section.title}
                                            </span>
                                            <button
                                                onClick={(e) => toggleFavorite(section.id, e)}
                                                className="p-0.5 shrink-0"
                                                title="Favorilerden kaldır"
                                            >
                                                <Star size={13} className="fill-amber-400 text-amber-400" />
                                            </button>
                                            {isActive && (
                                                <ChevronRight size={12} className="text-indigo-400 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                                <div className="mx-3 my-2 border-t border-slate-200/60" />
                            </>
                        );
                    })()}

                    {filteredSections.map(section => {
                        const isActive = section.id === activeSection;
                        const isFav = favorites.includes(section.id);
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
                                <span className={`text-[13px] font-medium truncate flex-1 ${
                                    isActive ? 'text-indigo-700' : 'text-slate-600'
                                }`}>
                                    {searchQuery.trim() ? hl(section.title) : section.title}
                                </span>
                                <button
                                    onClick={(e) => toggleFavorite(section.id, e)}
                                    className="p-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={isFav ? { opacity: 1 } : undefined}
                                    title={isFav ? 'Favorilerden kaldır' : 'Favorilere ekle'}
                                >
                                    <Star size={13} className={isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'} />
                                </button>
                                {isActive && (
                                    <ChevronRight size={12} className="text-indigo-400 shrink-0" />
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
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{currentSection.title}</h1>
                                    <button
                                        onClick={(e) => toggleFavorite(currentSection.id, e)}
                                        className="p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                                        title={favorites.includes(currentSection.id) ? 'Favorilerden kaldır' : 'Favorilere ekle'}
                                    >
                                        <Star size={18} className={favorites.includes(currentSection.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'} />
                                    </button>
                                </div>
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
                                    <div className={`grid gap-3 ${currentSection.images.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                                        {currentSection.images.map((img, i) => (
                                            <div
                                                key={i}
                                                className="group rounded-xl border border-slate-200/80 overflow-hidden bg-white cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all duration-300"
                                                onClick={() => openLightbox(img)}
                                            >
                                                <div className="relative aspect-video overflow-hidden">
                                                    <img src={img.src} alt={img.caption} className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105" loading="lazy" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                                        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                                                            <ZoomIn size={13} className="text-indigo-600" />
                                                            <span className="text-indigo-600 text-[11px] font-semibold">Büyüt</span>
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
                                                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 flex-1 hover:shadow-sm transition-shadow mb-1">
                                                    <h3 className="text-sm font-bold text-slate-700 mb-1">{hl(step.title)}</h3>
                                                    <p className="text-sm text-slate-500 leading-relaxed">{hl(step.description)}</p>
                                                    {step.image && (
                                                        <div
                                                            className="mt-3 rounded-lg border border-slate-200/80 overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all duration-300 group/img"
                                                            onClick={() => openLightbox(step.image)}
                                                        >
                                                            <div className="relative aspect-video overflow-hidden">
                                                                <img src={step.image.src} alt={step.image.caption} className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover/img:scale-105" loading="lazy" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                                                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                                                                        <ZoomIn size={13} className="text-indigo-600" />
                                                                        <span className="text-indigo-600 text-[11px] font-semibold">Büyüt</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                                                                <p className="text-[11px] text-slate-500 font-medium leading-snug line-clamp-2">{step.image.caption}</p>
                                                            </div>
                                                        </div>
                                                    )}
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
                                                <div key={i} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border ${style.bg} ${style.border}`}>
                                                    <TipIcon size={18} className={`${style.iconColor} shrink-0 mt-0.5`} />
                                                    <p className={`text-sm leading-relaxed ${style.text}`}>{hl(tip.text)}</p>
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
                                            <FaqItem key={i} question={item.q} answer={item.a} highlightFn={hl} />
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
