// Language Toggle
function setLang(lang) {
    if (lang === 'en') {
        document.body.classList.add('english');
        document.getElementById('btnEN').classList.add('active');
        document.getElementById('btnGA').classList.remove('active');
        localStorage.setItem('lang', 'en');
    } else {
        document.body.classList.remove('english');
        document.getElementById('btnGA').classList.add('active');
        document.getElementById('btnEN').classList.remove('active');
        localStorage.setItem('lang', 'ga');
    }
}

// Initialize language from localStorage
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'en') {
        setLang('en');
    }
});

// Mobile Menu Toggle
function toggleMenu() {
    const nav = document.getElementById('mainNav');
    nav.classList.toggle('active');
}

// Close mobile menu when clicking a link
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('mainNav').classList.remove('active');
    });
});

// Video Modal
function openVideo(videoId) {
    const modal = document.getElementById('videoModal');
    const iframe = document.getElementById('videoFrame');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeVideo() {
    const modal = document.getElementById('videoModal');
    const iframe = document.getElementById('videoFrame');
    iframe.src = '';
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeVideo();
    }
});

// Close modal on background click
document.getElementById('videoModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeVideo();
    }
});

// Writing item toggle (accordion)
function toggleWritingItem(element) {
    const item = element.closest('.writing-item');
    const wasOpen = item.classList.contains('open');
    
    // Close all items
    document.querySelectorAll('.writing-item').forEach(i => {
        i.classList.remove('open');
    });
    
    // Open clicked item if it wasn't open
    if (!wasOpen) {
        item.classList.add('open');
    }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Active nav link on scroll
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});


// Assemble contact email at runtime (keeps the address out of the raw HTML,
// defeating basic spam harvesters)
(function () {
    var el = document.getElementById('emailLink');
    if (!el) return;
    var parts = ['ronan', 'macconiomaire', 'com'];
    var addr = parts[0] + '\u0040' + parts[1] + '\u002E' + parts[2];
    el.setAttribute('href', 'mailto:' + addr);
    el.textContent = addr;
})();
