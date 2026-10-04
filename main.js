(function () {
    'use strict';

    // ===== Current year in the footer =====
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ===== Mobile / tablet menu =====
    var menuToggle = document.querySelector('.menu-toggle');
    var nav = document.getElementById('main-nav');

    function closeMenu() {
        nav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'פתיחת תפריט');
    }

    menuToggle.addEventListener('click', function () {
        var isOpen = nav.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.setAttribute('aria-label', isOpen ? 'סגירת תפריט' : 'פתיחת תפריט');
    });

    nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            closeMenu();
            menuToggle.focus();
        }
    });

    document.addEventListener('click', function (e) {
        if (nav.classList.contains('open') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });

    // ===== Highlight the menu item of the section on screen =====
    var navLinks = nav.querySelectorAll('a[href^="#"]');
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                navLinks.forEach(function (link) {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        navLinks.forEach(function (link) {
            var section = document.querySelector(link.getAttribute('href'));
            if (section) observer.observe(section);
        });
    }

    // ===== Back to top =====
    var backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', function () {
        backToTop.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
    backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0 });
    });

    // ===== WhatsApp links with a ready-made message =====
    var waMessage = 'היי!\nאני מעוניין/ת לשמוע עוד על עמדות הצילום של AURA EVENT 📸✨';
    document.querySelectorAll('.js-whatsapp').forEach(function (link) {
        link.href = 'https://wa.me/972512440252?text=' + encodeURIComponent(waMessage);
    });

    // ===== Hide images that failed to load (no broken-image icons) =====
    function hideIfBroken(img) {
        if (img.complete && img.naturalWidth === 0) {
            img.remove();
            return;
        }
        img.addEventListener('error', function () { img.remove(); });
    }
    var logoImg = document.querySelector('.logo-circle img');
    if (logoImg) {
        logoImg.addEventListener('error', function () { logoImg.parentElement.style.display = 'none'; });
        if (logoImg.complete && logoImg.naturalWidth === 0) logoImg.parentElement.style.display = 'none';
    }

    // ===== Gallery: endless scrolling strip =====
    var track = document.getElementById('gallery-track');
    if (track) {
        track.querySelectorAll('img').forEach(hideIfBroken);

        window.addEventListener('load', function () {
            var images = track.querySelectorAll('img');
            if (images.length === 0) {
                document.getElementById('events-section').style.display = 'none';
                return;
            }
            var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduceMotion) return;

            // Duplicate the pictures once so the strip loops without a gap
            images.forEach(function (img) {
                var clone = img.cloneNode(true);
                clone.alt = '';
                clone.setAttribute('aria-hidden', 'true');
                track.appendChild(clone);
            });
            track.classList.add('is-animated');
        });
    }

    // ===== Pop-up message =====
    var alertBox = document.getElementById('success-alert');
    var alertTimer;
    function showAlert(message) {
        alertBox.textContent = message;
        alertBox.classList.add('show');
        clearTimeout(alertTimer);
        alertTimer = setTimeout(function () { alertBox.classList.remove('show'); }, 3500);
    }

    // ===== Star rating =====
    var stars = document.querySelectorAll('#star-rating button');
    var ratingInput = document.getElementById('rating');

    function setRating(value) {
        ratingInput.value = value || '';
        stars.forEach(function (s) {
            var sValue = parseInt(s.getAttribute('data-value'), 10);
            s.classList.toggle('active', sValue <= value);
            s.setAttribute('aria-checked', String(sValue === value));
        });
    }

    stars.forEach(function (star) {
        star.addEventListener('click', function () {
            setRating(parseInt(star.getAttribute('data-value'), 10));
        });
    });

    // ===== Forms (sent securely to Formspree over HTTPS) =====
    function handleForm(form, options) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            if (options.validate && !options.validate()) return;

            var button = form.querySelector('button[type="submit"]');
            var originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'שולח...';

            try {
                var response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error(response.statusText);

                form.reset();
                if (options.onReset) options.onReset();
                showAlert(options.success);
            } catch (err) {
                showAlert('❌ אירעה שגיאה בשליחה. נסו שוב או התקשרו 051-2440252');
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    }

    handleForm(document.getElementById('review-form'), {
        success: '✔️ הביקורת שלך נשלחה בהצלחה! תודה רבה',
        validate: function () {
            if (!ratingInput.value) {
                showAlert('⭐ בחרו דירוג בכוכבים לפני השליחה');
                stars[0].focus();
                return false;
            }
            return true;
        },
        onReset: function () { setRating(0); }
    });

    handleForm(document.getElementById('contact-form'), {
        success: '✔️ הודעתך נשלחה בהצלחה! נחזור אליך בהקדם.'
    });
})();
