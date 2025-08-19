document.addEventListener('DOMContentLoaded', () => {
    // FAQ accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Toggle active class on the clicked item
            item.classList.toggle('active');
            
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
        });
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animation for step cards on scroll
    const stepCards = document.querySelectorAll('.step-card');
    const animateOnScroll = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    };
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(animateOnScroll, {
            root: null,
            threshold: 0.3
        });
        
        stepCards.forEach(card => {
            observer.observe(card);
        });
    }
    
    // Add animate classes to step cards for CSS animations
    stepCards.forEach((card, index) => {
        card.classList.add('step-card-' + (index + 1));
    });
    
    // Additional CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .step-card {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }
        
        .step-card.animate {
            opacity: 1;
            transform: translateY(0);
        }
        
        .step-card-1.animate {
            transition-delay: 0.1s;
        }
        
        .step-card-2.animate {
            transition-delay: 0.3s;
        }
        
        .step-card-3.animate {
            transition-delay: 0.5s;
        }
    `;
    document.head.appendChild(style);
    
    // Trigger animations for elements already in viewport
    setTimeout(() => {
        if ('IntersectionObserver' in window) {
            const cards = document.querySelectorAll('.step-card:not(.animate)');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                if (rect.top <= window.innerHeight * 0.7) {
                    card.classList.add('animate');
                }
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            stepCards.forEach(card => {
                card.classList.add('animate');
            });
        }
    }, 100);
});