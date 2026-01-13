// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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

// Header scroll effect
let lastScroll = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
    } else {
        header.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards and sections
document.querySelectorAll('.contact-card, .social-content').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add active state to current time
function updateCurrentDay() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    const hoursRows = document.querySelectorAll('.hours-row');
    
    hoursRows.forEach((row, index) => {
        row.style.opacity = '0.6';
        row.style.fontWeight = 'normal';
    });
    
    // Highlight current day
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        hoursRows[0].style.opacity = '1';
        hoursRows[0].style.fontWeight = '600';
    } else if (dayOfWeek === 6) { // Saturday
        hoursRows[1].style.opacity = '1';
        hoursRows[1].style.fontWeight = '600';
    } else { // Sunday
        hoursRows[2].style.opacity = '1';
        hoursRows[2].style.fontWeight = '600';
    }
}

// Call on page load
updateCurrentDay();

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Add hover effect to phone number links
document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('mouseenter', () => {
        link.style.transform = 'scale(1.05)';
    });
    
    link.addEventListener('mouseleave', () => {
        link.style.transform = 'scale(1)';
    });
});

// Console welcome message
console.log('%cTHE SOHO hairdressing', 'font-size: 24px; font-weight: bold; color: #d4af37;');
console.log('%cWillkommen auf unserer Website! 💇‍♀️', 'font-size: 14px; color: #666;');

// Preload images for better performance
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});
