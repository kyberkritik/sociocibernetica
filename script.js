// ===================================================
// CUSDIS COMMENTS CONFIGURATION
// ===================================================
const CUSDIS_HOST      = 'https://cusdis.com';
const CUSDIS_APP_ID    = '27a523d7-444b-4fb4-8538-a4d952a61dd1';
const CUSDIS_PAGE_ID   = 'sociocibernetica-jorge-cardiel-2025';
const CUSDIS_PAGE_TITLE = 'Sociocibernética — Ponencia Dr. Jorge Cardiel Herrera';

// Preguntas de debate para el ticker (fallback si no hay comentarios)
const TICKER_QUESTIONS = [
    '¿Qué diferencia la cibernética de 1.° y 2.° orden?',
    '¿Implica el constructivismo una responsabilidad ética?',
    '¿Es la autopoiesis aplicable a sistemas sociales?',
    '¿Cómo evitar que la sociocibernética caiga en tecnocracia?',
    '¿Qué aporta la IAP a la teoría de sistemas?',
    'Donna Haraway y el conocimiento situado',
    '¿La "mano invisible" es equivalente a la autoorganización?',
    'Únete al debate',
];

// Drawer state
let drawerOpen = false;
let drawerIframeLoaded = false;
let classicCusdisLoaded = false;

function openCommentsDrawer() {
    drawerOpen = true;
    const drawer  = document.getElementById('comments-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const btn     = document.getElementById('cbar-open-btn');

    // Lazy-render Cusdis en el drawer usando la misma función que usa el script oficial
    if (!drawerIframeLoaded) {
        const drawerDiv = document.getElementById('cusdis_thread_drawer');
        if (drawerDiv) {
            drawerDiv.dataset.pageUrl = window.location.href;
            // Esperar a que el script de Cusdis esté cargado antes de renderizar
            renderCusdisWhenReady(drawerDiv);
            drawerIframeLoaded = true;
        }
    }

    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    btn && btn.setAttribute('aria-expanded', 'true');
}

function renderCusdisWhenReady(el) {
    if (typeof window.renderCusdis === 'function') {
        window.renderCusdis(el);
    } else {
        // El script aún no cargó — reintentar cada 200ms hasta que esté listo
        const interval = setInterval(() => {
            if (typeof window.renderCusdis === 'function') {
                clearInterval(interval);
                window.renderCusdis(el);
            }
        }, 200);
        // Parar de reintentar tras 10s
        setTimeout(() => clearInterval(interval), 10000);
    }
}

function closeCommentsDrawer() {
    drawerOpen = false;
    const drawer  = document.getElementById('comments-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const btn     = document.getElementById('cbar-open-btn');

    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    btn && btn.setAttribute('aria-expanded', 'false');
}

function initCommentsBar() {
    // Set page_url on the embedded Cusdis div (classic section)
    const cusdisDiv = document.getElementById('cusdis_thread');
    if (cusdisDiv) {
        cusdisDiv.dataset.pageUrl = window.location.href;
    }

    document.getElementById('cbar-open-btn')
        ?.addEventListener('click', () => drawerOpen ? closeCommentsDrawer() : openCommentsDrawer());

    document.getElementById('drawer-close-btn')
        ?.addEventListener('click', closeCommentsDrawer);

    document.getElementById('drawer-overlay')
        ?.addEventListener('click', closeCommentsDrawer);

    // Close drawer with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawerOpen) closeCommentsDrawer();
    });

    // Auto-resize del iframe de Cusdis via postMessage
    window.addEventListener('message', (e) => {
        if (e.origin !== 'https://cusdis.com') return;
        try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (data && data.from === 'cusdis' && data.type === 'resize' && data.height) {
                // Resize el iframe clásico
                const classicIframe = document.querySelector('#cusdis_thread iframe');
                if (classicIframe) {
                    classicIframe.style.height = `${Math.max(data.height + 40, 500)}px`;
                }
            }
        } catch (_) {}
    });

    // Fetch comentarios para el ticker
    fetchCusdisComments();
}

async function fetchCusdisComments() {
    try {
        // Cusdis public API endpoint para comentarios aprobados
        const url = `${CUSDIS_HOST}/api/open/v1/page/comment?appId=${CUSDIS_APP_ID}&pageId=${CUSDIS_PAGE_ID}&page=1&size=20`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('API no disponible');
        const json = await res.json();

        const comments = (json?.data?.data || json?.data || []).filter(c => c.approved_at);
        if (comments.length > 0) {
            buildTickerWithComments(comments);
        }
    } catch (_) {
        // Silently fall back to discussion questions only (already in the ticker)
    }
}

function buildTickerWithComments(comments) {
    const track = document.querySelector('.cbar-track');
    if (!track) return;

    // Construir items: comentarios reales intercalados con preguntas
    const allItems = [];
    comments.forEach(c => {
        const name = c.by_nickname || 'Participante';
        const text = (c.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 120);
        if (text) allItems.push({ type: 'comment', name, text });
    });
    TICKER_QUESTIONS.forEach(q => allItems.push({ type: 'question', text: q }));

    const makeSpan = (item) => {
        const span = document.createElement('span');
        if (item.type === 'comment') {
            span.className = 'cbar-item is-comment';
            span.innerHTML = `<span class="cbar-author">${item.name}</span>: ${item.text} &nbsp;·&nbsp;`;
        } else {
            span.className = 'cbar-item';
            span.textContent = item.text + ' · ';
        }
        return span;
    };

    // Limpiar y reconstruir con contenido duplicado para loop continuo
    track.innerHTML = '';
    const wrap1 = document.createElement('span');
    const wrap2 = document.createElement('span');
    wrap2.setAttribute('aria-hidden', 'true');
    allItems.forEach(item => {
        wrap1.appendChild(makeSpan(item));
        wrap2.appendChild(makeSpan(item));
    });
    track.appendChild(wrap1);
    track.appendChild(wrap2);
}

// Garantiza que el embed clásico de Cusdis esté inicializado
function ensureClassicCusdis() {
    if (classicCusdisLoaded) return;
    const el = document.getElementById('cusdis_thread');
    if (!el) return;
    // Si el script ya inyectó un iframe, no hacemos nada
    if (el.querySelector('iframe')) {
        classicCusdisLoaded = true;
        return;
    }
    el.dataset.pageUrl = window.location.href;
    renderCusdisWhenReady(el);
    classicCusdisLoaded = true;
}

function scrollToClassicComments() {
    const videoSec = document.getElementById('video-section');
    const classic  = document.getElementById('comments-classic-section');
    if (!classic) return;

    if (!videoSec || videoSec.style.display === 'none') {
        showSection('video');
    }

    closeCommentsDrawer();

    // Asegurar que Cusdis esté cargado y luego hacer scroll
    setTimeout(() => {
        ensureClassicCusdis();
        classic.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
}

// ===================================================
// SECTION NAVIGATION (Landing / Video / Presentation)
// ===================================================
function showSection(section) {
    const landing = document.getElementById('landing-page');
    const videoSec = document.getElementById('video-section');
    const presentSec = document.getElementById('presentation-section');

    // Hide all
    landing.style.display = 'none';
    videoSec.style.display = 'none';
    presentSec.style.display = 'none';

    if (section === 'landing') {
        landing.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else if (section === 'video') {
        videoSec.style.display = 'block';
        document.body.style.overflow = 'hidden'; // the section itself scrolls
        videoSec.scrollTop = 0;
        // Inicializar Cusdis clásico si aún no está listo
        setTimeout(ensureClassicCusdis, 300);
    } else if (section === 'presentation') {
        presentSec.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Re-initialize presentation state
        reinitPresentation();
    }
}

// ===================================================
// PRESENTATION LOGIC
// ===================================================
let currentSlide = 1;
const totalSlides = 12;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Start on landing page; presentation starts hidden
    showSection('landing');
    initCommentsBar();
    initializeKeyboardNavigation();
    // Swipe & wheel only affect presentation when active
    initializeSwipeGestures();
});

// Navigation Functions
function nextSlide() {
    if (currentSlide < totalSlides) {
        const current = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        current.classList.remove('active');
        current.classList.add('prev');
        
        currentSlide++;
        
        const next = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        next.classList.add('active');
        next.classList.remove('prev');
        
        updateSlideDisplay();
        updateProgressBar();
        animateCurrentSlide();
    }
}

function prevSlide() {
    if (currentSlide > 1) {
        const current = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        current.classList.remove('active');
        
        currentSlide--;
        
        const prev = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        prev.classList.add('active');
        prev.classList.remove('prev');
        
        updateSlideDisplay();
        updateProgressBar();
        animateCurrentSlide();
    }
}

function goToSlide(slideNumber) {
    if (slideNumber >= 1 && slideNumber <= totalSlides && slideNumber !== currentSlide) {
        const current = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        current.classList.remove('active');
        
        if (slideNumber < currentSlide) {
            current.classList.remove('prev');
        } else {
            current.classList.add('prev');
        }
        
        currentSlide = slideNumber;
        
        const target = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        target.classList.add('active');
        
        updateSlideDisplay();
        updateProgressBar();
        animateCurrentSlide();
    }
}

// Update Display
function updateSlideDisplay() {
    document.getElementById('currentSlide').textContent = currentSlide;
    document.getElementById('totalSlides').textContent = totalSlides;
}

function updateProgressBar() {
    const progress = (currentSlide / totalSlides) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

// Animate Elements in Current Slide
function animateCurrentSlide() {
    const currentSlideElement = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
    
    // Animate SVGs
    const svgs = currentSlideElement.querySelectorAll('svg');
    svgs.forEach((svg, index) => {
        svg.style.opacity = '0';
        svg.style.transform = 'scale(0.8)';
        setTimeout(() => {
            svg.style.transition = 'all 0.6s ease-out';
            svg.style.opacity = '1';
            svg.style.transform = 'scale(1)';
        }, 200 + (index * 100));
    });
    
    // Animate list items
    const listItems = currentSlideElement.querySelectorAll('.bullet-list li, .future-list li');
    listItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-30px)';
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease-out';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 300 + (index * 150));
    });
    
    // Animate grid items
    const gridItems = currentSlideElement.querySelectorAll('.grid-item');
    gridItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        setTimeout(() => {
            item.style.transition = 'all 0.6s ease-out';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
    
    // Animate critique items
    const critiqueItems = currentSlideElement.querySelectorAll('.critique-item');
    critiqueItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-50px)';
        setTimeout(() => {
            item.style.transition = 'all 0.6s ease-out';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 200 + (index * 100));
    });
}

// Event Listeners (buttons may not exist until presentation section is shown)
document.addEventListener('click', (e) => {
    if (e.target.id === 'nextBtn') nextSlide();
    if (e.target.id === 'prevBtn') prevSlide();
});

// Keyboard Navigation
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        const presentSec = document.getElementById('presentation-section');
        const presentationActive = presentSec && presentSec.style.display !== 'none';
        if (!presentationActive) return;
        switch(e.key) {
            case 'ArrowRight':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault();
                prevSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(1);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides);
                break;
            // Number keys for direct navigation
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                const slideNum = parseInt(e.key);
                if (slideNum <= totalSlides) {
                    goToSlide(slideNum);
                }
                break;
        }
    });
}

// Touch/Swipe Gestures
function initializeSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    
    const presentationContainer = document.querySelector('.presentation-container');
    
    presentationContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    });
    
    presentationContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const horizontalDiff = touchStartX - touchEndX;
        const verticalDiff = Math.abs(touchStartY - touchEndY);
        
        // Only register horizontal swipes
        if (verticalDiff < swipeThreshold) {
            if (horizontalDiff > swipeThreshold) {
                // Swipe left - next slide
                nextSlide();
            } else if (horizontalDiff < -swipeThreshold) {
                // Swipe right - previous slide
                prevSlide();
            }
        }
    }
}

// Mouse Wheel Navigation (presentation only)
let isScrolling = false;
document.addEventListener('wheel', (e) => {
    const presentSec = document.getElementById('presentation-section');
    if (!presentSec || presentSec.style.display === 'none') return;
    if (!isScrolling) {
        isScrolling = true;
        if (e.deltaY > 0) {
            nextSlide();
        } else if (e.deltaY < 0) {
            prevSlide();
        }
        setTimeout(() => { isScrolling = false; }, 800);
    }
});

// Geometric Shape Animations
class GeometricAnimator {
    constructor() {
        this.shapes = {
            circles: document.querySelectorAll('.circle'),
            squares: document.querySelectorAll('.square'),
            triangles: document.querySelectorAll('.triangle'),
            hexagons: document.querySelectorAll('.hexagon')
        };
        this.animateShapes();
    }
    
    animateShapes() {
        // Animate circles with random movements
        this.shapes.circles.forEach((circle, index) => {
            setInterval(() => {
                const randomX = Math.random() * 20 - 10;
                const randomY = Math.random() * 20 - 10;
                circle.style.transform = `translate(${randomX}px, ${randomY}px)`;
            }, 3000 + (index * 500));
        });
        
        // Rotate squares continuously
        this.shapes.squares.forEach((square, index) => {
            let rotation = 45;
            setInterval(() => {
                rotation += 0.5;
                square.style.transform = `rotate(${rotation}deg)`;
            }, 50);
        });
    }
}

// Initialize geometric animations
const geometricAnimator = new GeometricAnimator();

// SVG Path Animations
function animateSVGPaths() {
    const paths = document.querySelectorAll('.feedback-arrow, .production-arrow, .reflect-arrow');
    
    paths.forEach(path => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        
        setTimeout(() => {
            path.style.transition = 'stroke-dashoffset 2s ease-in-out';
            path.style.strokeDashoffset = 0;
        }, 500);
    });
}

// Particle System for Background
class ParticleSystem {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 50;
        
        this.init();
    }
    
    init() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        this.canvas.style.opacity = '0.3';
        
        document.body.appendChild(this.canvas);
        
        this.resize();
        this.createParticles();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 2 + 1,
                vx: Math.random() * 0.5 - 0.25,
                vy: Math.random() * 0.5 - 0.25,
                color: this.getRandomColor()
            });
        }
    }
    
    getRandomColor() {
        const colors = ['#FF6B35', '#F7931E', '#FBB03B', '#7B2CBF', '#E83F6F', '#00B4D8', '#06D6A0', '#FFD60A'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Wrap around screen
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        });
        
        // Draw connections
        this.particles.forEach((p1, i) => {
            this.particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 100)})`;
                    this.ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize particle system
const particleSystem = new ParticleSystem();

// Fullscreen Toggle (presentation only)
document.addEventListener('keydown', (e) => {
    const presentSec = document.getElementById('presentation-section');
    if (!presentSec || presentSec.style.display === 'none') return;
    if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
});

// Print/Export Functionality
document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        window.print();
    }
});

// Auto-advance (optional - commented out)
/*
let autoAdvanceInterval;
function startAutoAdvance(intervalMs = 10000) {
    autoAdvanceInterval = setInterval(() => {
        if (currentSlide < totalSlides) {
            nextSlide();
        } else {
            stopAutoAdvance();
        }
    }, intervalMs);
}

function stopAutoAdvance() {
    clearInterval(autoAdvanceInterval);
}

// Press 'a' to toggle auto-advance
document.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        if (autoAdvanceInterval) {
            stopAutoAdvance();
        } else {
            startAutoAdvance();
        }
    }
});
*/

// Slide Overview Mode (press 'o')
document.addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') {
        toggleOverviewMode();
    }
});

function toggleOverviewMode() {
    const container = document.querySelector('.presentation-container');
    container.classList.toggle('overview-mode');
    
    if (container.classList.contains('overview-mode')) {
        const slides = document.querySelectorAll('.slide');
        slides.forEach((slide, index) => {
            slide.style.position = 'relative';
            slide.style.transform = 'scale(0.2)';
            slide.style.opacity = '1';
            slide.style.display = 'inline-block';
            slide.style.width = '25%';
            slide.style.height = '25vh';
            slide.style.margin = '0.5%';
            slide.style.cursor = 'pointer';
            
            slide.onclick = () => {
                toggleOverviewMode();
                goToSlide(index + 1);
            };
        });
    } else {
        const slides = document.querySelectorAll('.slide');
        slides.forEach((slide, index) => {
            slide.style.position = 'absolute';
            slide.style.width = '100%';
            slide.style.height = '100vh';
            slide.style.margin = '0';
            slide.onclick = null;
            
            if (index + 1 === currentSlide) {
                slide.classList.add('active');
                slide.style.transform = 'translateX(0)';
                slide.style.opacity = '1';
            } else {
                slide.classList.remove('active');
                slide.style.transform = 'translateX(100%)';
                slide.style.opacity = '0';
            }
        });
    }
}

// Help Overlay (press 'h')
document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
        toggleHelpOverlay();
    }
});

function toggleHelpOverlay() {
    let helpOverlay = document.getElementById('helpOverlay');
    
    if (!helpOverlay) {
        helpOverlay = document.createElement('div');
        helpOverlay.id = 'helpOverlay';
        helpOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(43, 45, 66, 0.95);
            padding: 3rem;
            border-radius: 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            z-index: 10000;
            color: #EDF2F4;
            font-size: 1.2rem;
            backdrop-filter: blur(10px);
        `;
        
        helpOverlay.innerHTML = `
            <h2 style="color: #FF6B35; margin-bottom: 1.5rem;">⌨️ Atajos de Teclado</h2>
            <ul style="list-style: none; line-height: 2;">
                <li>→ / Espacio: Siguiente diapositiva</li>
                <li>← : Diapositiva anterior</li>
                <li>Home: Primera diapositiva</li>
                <li>End: Última diapositiva</li>
                <li>1-9: Ir a diapositiva específica</li>
                <li>F: Pantalla completa</li>
                <li>O: Vista general</li>
                <li>H: Mostrar/ocultar ayuda</li>
                <li>P: Imprimir</li>
            </ul>
            <p style="text-align: center; margin-top: 2rem; opacity: 0.7;">Presiona H para cerrar</p>
        `;
        
        document.body.appendChild(helpOverlay);
    } else {
        helpOverlay.remove();
    }
}

// Re-initialize presentation display when section becomes visible
function reinitPresentation() {
    currentSlide = 1;
    const slides = document.querySelectorAll('.slide');
    slides.forEach(s => {
        s.classList.remove('active', 'prev');
        s.style.transform = '';
        s.style.opacity = '';
    });
    const first = document.querySelector('.slide[data-slide="1"]');
    if (first) first.classList.add('active');
    updateSlideDisplay();
    updateProgressBar();
    animateCurrentSlide();
}

console.log('🎨 Presentación Sociocibernética cargada correctamente');
console.log('💡 Presiona H para ver los atajos de teclado');
