/* =========================================================
   Rimbo Designs — site JavaScript (rimbodesigns.com)
   Loaded once, site-wide, from Site settings → Footer, in place of the
   old Slater tags (below GSAP, ScrollTrigger, SplitText and Lenis):
   <script src="https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@vX.Y.Z/main.min.js"></script>
   (no defer; jsDelivr builds main.min.js from this file automatically)

   Each section below is one former Slater script (project 13857), wrapped
   in its own function so names can't clash. The router at the bottom
   decides which sections run on which page.
   ========================================================= */

(function () {

  // =========================================================
  // GLOBAL — every page (Slater 35206)
  // =========================================================
  function rdGlobal() {
    //NAV_Onload

    // Select all child elements within #Top_Nav
    const navItems = document.querySelectorAll('#Container_topNAv > *');

    // Animate the items
    gsap.from(navItems, {
      y: -50, // Start 60px above their final position
      opacity: 0, // Start with opacity 0
      duration: 1, // Duration of the animation
      stagger: {
        amount: 0.3, // Total time to stagger all animations
        from: "center" // Start staggering from the center
      },
      ease: 'expo.out', // Easing function
      filter: "blur(10px)" // Apply a blur filter
    });

    // Define constants for the elements
    const TOP_NAV = document.getElementById("Top_Nav");
    const FIXED_NAV = document.getElementById("FIXED_NAV");

    // Use GSAP's matchMedia to apply the animation only when the screen width is above 991px
    gsap.matchMedia().add("(min-width: 992px)", () => {
      // Initially move FIXED_NAV out of view
      gsap.set(FIXED_NAV, { y: -64 });

      // Apply the scroll animation
      gsap.to(FIXED_NAV, {
        y: 0,
        scrollTrigger: {
          trigger: TOP_NAV,
          start: "top top",
          end: "top -300", // Extended range for smoother transition
          scrub: true
        }
      });

      return () => {
        // Cleanup function: Kill animation when screen size changes
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      };
    });

    //STAGGER BTN

    function initButtonCharacterStagger() {
      const offsetIncrement = 0.01; // Transition offset increment in seconds
      const buttons = document.querySelectorAll('[data-button-animate-chars]');

      buttons.forEach(button => {
        const text = button.textContent; // Get the button's text content
        button.innerHTML = ''; // Clear the original content

        [...text].forEach((char, index) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.transitionDelay = `${index * offsetIncrement}s`;

          // Handle spaces explicitly
          if (char === ' ') {
            span.style.whiteSpace = 'pre'; // Preserve space width
          }

          button.appendChild(span);
        });
      });
    }

    // Initialize Button Character Stagger Animation
    initButtonCharacterStagger();

    // ________ scrub scrolltrigger ________

    // Animate elements with the custom attribute data-title
    function animateTitles() {
      const titles = document.querySelectorAll('[data-title]');
      titles.forEach(title => {
        gsap.from(title, {
          y: 50,
          opacity: 0,
          transform: 'scale(0.95)',
          filter: 'blur(3px)',
          ease: 'expo.out',
          scrollTrigger: {
            trigger: title,
            start: "top 133%",
            end: "bottom 80%",
            scrub: true
          }
        });
      });
    }

    // Animate elements with the custom attribute data-paragraph using SplitText
    function animateParagraphs() {
      const paragraphs = document.querySelectorAll('[data-paragraph]');
      paragraphs.forEach(paragraph => {
        // Split the text into lines
        const split = new SplitText(paragraph, { type: "lines" });
        const lines = split.lines;

        // Animate each line
        gsap.from(lines, {
          y: 50,
          opacity: 0,
          transform: 'scale(0.95)',
          filter: 'blur(3px)',
          ease: 'expo.out',
          stagger: 0.1, // Stagger the animation for each line
          scrollTrigger: {
            trigger: paragraph,
            start: "top 133%",
            end: "bottom 100%",
            scrub: true // Smooth scrubbin
          }
        });
      });
    }

    // Select all elements with the custom data attribute
    const elements = document.querySelectorAll('[data-component]');

    // Function to animate elements
    function animateElements(elements) {
      elements.forEach(element => {
        gsap.from(element,
        {
          opacity: 0,
          y: 50,
          transform: 'scale(0.98)',
          filter: 'blur(2px)',
          ease: 'expo.out',
          scrollTrigger: {
            trigger: element,
            start: "top 133%",
            end: "bottom 80%",
            scrub: true // Smooth scrubbin
          },
          duration: 1 // Duration of the animation
        });
      });
    }

    // Call the animation functions
    animateTitles();
    animateParagraphs();
    animateElements(elements);

    //MARQUEE

    function initMarqueeScrollDirection() {
      const marquees = [];

      document.querySelectorAll('[data-marquee-scroll-direction-target]').forEach((marquee) => {
        // Query marquee elements
        const marqueeContent = marquee.querySelector('[data-marquee-collection-target]');
        const marqueeScroll = marquee.querySelector('[data-marquee-scroll-target]');
        if (!marqueeContent || !marqueeScroll) return;

        // Get data attributes
        const {
          marqueeSpeed: speed,
          marqueeDirection: direction,
          marqueeDuplicate: duplicate,
          marqueeScrollSpeed: scrollSpeed
        } = marquee.dataset;

        // Convert data attributes to usable types
        const marqueeSpeedAttr = parseFloat(speed);
        const marqueeDirectionAttr = direction === 'right' ? 1 : -1; // 1 for right, -1 for left
        const duplicateAmount = parseInt(duplicate || 0);
        const scrollSpeedAttr = parseFloat(scrollSpeed);
        const speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;

        let marqueeSpeed = marqueeSpeedAttr * (marqueeContent.offsetWidth / window.innerWidth) *
          speedMultiplier;

        // Precompute styles for the scroll container
        marqueeScroll.style.marginLeft = `${scrollSpeedAttr * -1}%`;
        marqueeScroll.style.width = `${(scrollSpeedAttr * 2) + 100}%`;

        // Duplicate marquee content
        if (duplicateAmount > 0) {
          const fragment = document.createDocumentFragment();
          for (let i = 0; i < duplicateAmount; i++) {
            fragment.appendChild(marqueeContent.cloneNode(true));
          }
          marqueeScroll.appendChild(fragment);
        }

        // GSAP animation for marquee content
        const marqueeItems = marquee.querySelectorAll('[data-marquee-collection-target]');
        const animation = gsap.to(marqueeItems, {
          xPercent: -100, // Move completely out of view
          repeat: -1,
          duration: marqueeSpeed,
          ease: 'linear'
        }).totalProgress(0.5);

        // Initialize marquee in the correct direction
        gsap.set(marqueeItems, { xPercent: marqueeDirectionAttr === 1 ? 100 : -100 });
        animation.timeScale(marqueeDirectionAttr); // Set correct direction
        animation.play(); // Start animation immediately

        // Set initial marquee status
        marquee.setAttribute('data-marquee-status', 'normal');

        // Store for the global direction watcher
        marquees.push({ el: marquee, animation, baseDirection: marqueeDirectionAttr });

        // Extra speed effect on scroll
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: marquee,
            start: '0% 100%',
            end: '100% 0%',
            scrub: 0
          }
        });

        const scrollStart = marqueeDirectionAttr === -1 ? scrollSpeedAttr : -scrollSpeedAttr;
        const scrollEnd = -scrollStart;

        tl.fromTo(marqueeScroll, { x: `${scrollStart}vw` }, { x: `${scrollEnd}vw`, ease: 'none' });
      });

      if (!marquees.length) return;

      // One global watcher so every marquee flips at the same moment
      let lastDirection = 0;

      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (self.direction === lastDirection) return;
          lastDirection = self.direction;

          const isInverted = self.direction === 1; // Scrolling down

          marquees.forEach(({ el, animation, baseDirection }) => {
            animation.timeScale(isInverted ? -baseDirection : baseDirection);
            el.setAttribute('data-marquee-status', isInverted ? 'inverted' : 'normal');
          });
        }
      });
    }

    // Initialize Marquee with Scroll Direction
    initMarqueeScrollDirection();
    //cursorEffect

    let cursorItem = document.querySelector(".cursor");
    if (cursorItem) {
      let cursorParagraph = cursorItem.querySelector("p");
      let targets = document.querySelectorAll("[data-cursor]");
      let xOffset = 6;
      let yOffset = 80;
      let cursorIsOnRight = false;
      let currentTarget = null;
      let lastText = '';

      gsap.set(cursorItem, { xPercent: xOffset, yPercent: yOffset });

      let xTo = gsap.quickTo(cursorItem, "x", { ease: "power3" });
      let yTo = gsap.quickTo(cursorItem, "y", { ease: "power3" });

      const getCursorEdgeThreshold = () => {
        return cursorItem.offsetWidth + 16;
      };

      window.addEventListener("mousemove", e => {
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
        let scrollY = window.scrollY;
        let cursorX = e.clientX;
        let cursorY = e.clientY + scrollY;

        let xPercent = xOffset;
        let yPercent = yOffset;

        let cursorEdgeThreshold = getCursorEdgeThreshold();
        if (cursorX > windowWidth - cursorEdgeThreshold) {
          cursorIsOnRight = true;
          xPercent = -100;
        } else {
          cursorIsOnRight = false;
        }

        if (cursorY > scrollY + windowHeight * 0.9) {
          yPercent = -30;
        }

        if (currentTarget) {
          let newText = currentTarget.getAttribute("data-cursor");
          if (newText !== lastText) {
            cursorParagraph.innerHTML = newText;
            lastText = newText;
            cursorEdgeThreshold = getCursorEdgeThreshold();
          }
        }

        gsap.to(cursorItem, {
          xPercent: xPercent,
          yPercent: yPercent,
          duration: 0.9,
          ease: "power3"
        });
        xTo(cursorX);
        yTo(cursorY - scrollY);
      });

      targets.forEach(target => {
        target.addEventListener("mouseenter", () => {
          currentTarget = target;
          let newText = target.getAttribute("data-cursor");

          if (newText !== lastText) {
            cursorParagraph.innerHTML = newText;
            lastText = newText;
            let cursorEdgeThreshold = getCursorEdgeThreshold();
          }
        });
      });
    }
  }

  // =========================================================
  // FORM CODE — every page with [data-form-validate] (Slater 39499)
  // =========================================================
  function rdFormValidation() {
    //form field

    function initAdvancedFormValidation() {
      const forms = document.querySelectorAll('[data-form-validate]');

      forms.forEach((formContainer) => {
        const startTime = new Date().getTime();

        const form = formContainer.querySelector('form');
        if (!form) return;

        const validateFields = form.querySelectorAll('[data-validate]');
        const dataSubmit = form.querySelector('[data-submit]');
        if (!dataSubmit) return;

        const realSubmitInput = dataSubmit.querySelector('input[type="submit"]');
        if (!realSubmitInput) return;

        function isSpam() {
          const currentTime = new Date().getTime();
          return currentTime - startTime < 5000;
        }

        // Disable select options with invalid values on page load
        validateFields.forEach(function (fieldGroup) {
          const select = fieldGroup.querySelector('select');
          if (select) {
            const options = select.querySelectorAll('option');
            options.forEach(function (option) {
              if (
                option.value === '' ||
                option.value === 'disabled' ||
                option.value === 'null' ||
                option.value === 'false'
              ) {
                option.setAttribute('disabled', 'disabled');
              }
            });
          }
        });

        function validateAndStartLiveValidationForAll() {
          let allValid = true;
          let firstInvalidField = null;

          validateFields.forEach(function (fieldGroup) {
            const input = fieldGroup.querySelector('input, textarea, select');
            const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
            if (!input && !radioCheckGroup) return;

            if (input) input.__validationStarted = true;
            if (radioCheckGroup) {
              radioCheckGroup.__validationStarted = true;
              const inputs = radioCheckGroup.querySelectorAll(
                'input[type="radio"], input[type="checkbox"]');
              inputs.forEach(function (input) {
                input.__validationStarted = true;
              });
            }

            updateFieldStatus(fieldGroup);

            if (!isValid(fieldGroup)) {
              allValid = false;
              if (!firstInvalidField) {
                firstInvalidField = input || radioCheckGroup.querySelector('input');
              }
            }
          });

          if (!allValid && firstInvalidField) {
            firstInvalidField.focus();
          }

          return allValid;
        }

        function isValid(fieldGroup) {
          const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
          if (radioCheckGroup) {
            const inputs = radioCheckGroup.querySelectorAll(
              'input[type="radio"], input[type="checkbox"]');
            const checkedInputs = radioCheckGroup.querySelectorAll('input:checked');
            const min = parseInt(radioCheckGroup.getAttribute('min')) || 1;
            const max = parseInt(radioCheckGroup.getAttribute('max')) || inputs.length;
            const checkedCount = checkedInputs.length;

            if (inputs[0].type === 'radio') {
              return checkedCount >= 1;
            } else {
              if (inputs.length === 1) {
                return inputs[0].checked;
              } else {
                return checkedCount >= min && checkedCount <= max;
              }
            }
          } else {
            const input = fieldGroup.querySelector('input, textarea, select');
            if (!input) return false;

            let valid = true;
            const min = parseInt(input.getAttribute('min')) || 0;
            const max = parseInt(input.getAttribute('max')) || Infinity;
            const value = input.value.trim();
            const length = value.length;

            if (input.tagName.toLowerCase() === 'select') {
              if (
                value === '' ||
                value === 'disabled' ||
                value === 'null' ||
                value === 'false'
              ) {
                valid = false;
              }
            } else if (input.type === 'email') {
              const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              valid = emailPattern.test(value);
            } else {
              if (input.hasAttribute('min') && length < min) valid = false;
              if (input.hasAttribute('max') && length > max) valid = false;
            }

            return valid;
          }
        }

        function updateFieldStatus(fieldGroup) {
          const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
          if (radioCheckGroup) {
            const inputs = radioCheckGroup.querySelectorAll(
              'input[type="radio"], input[type="checkbox"]');
            const checkedInputs = radioCheckGroup.querySelectorAll('input:checked');

            if (checkedInputs.length > 0) {
              fieldGroup.classList.add('is--filled');
            } else {
              fieldGroup.classList.remove('is--filled');
            }

            const valid = isValid(fieldGroup);

            if (valid) {
              fieldGroup.classList.add('is--success');
              fieldGroup.classList.remove('is--error');
            } else {
              fieldGroup.classList.remove('is--success');
              const anyInputValidationStarted = Array.from(inputs).some(input => input
                .__validationStarted);
              if (anyInputValidationStarted) {
                fieldGroup.classList.add('is--error');
              } else {
                fieldGroup.classList.remove('is--error');
              }
            }
          } else {
            const input = fieldGroup.querySelector('input, textarea, select');
            if (!input) return;

            const value = input.value.trim();

            if (value) {
              fieldGroup.classList.add('is--filled');
            } else {
              fieldGroup.classList.remove('is--filled');
            }

            const valid = isValid(fieldGroup);

            if (valid) {
              fieldGroup.classList.add('is--success');
              fieldGroup.classList.remove('is--error');
            } else {
              fieldGroup.classList.remove('is--success');
              if (input.__validationStarted) {
                fieldGroup.classList.add('is--error');
              } else {
                fieldGroup.classList.remove('is--error');
              }
            }
          }
        }

        validateFields.forEach(function (fieldGroup) {
          const input = fieldGroup.querySelector('input, textarea, select');
          const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

          if (radioCheckGroup) {
            const inputs = radioCheckGroup.querySelectorAll(
              'input[type="radio"], input[type="checkbox"]');
            inputs.forEach(function (input) {
              input.__validationStarted = false;

              input.addEventListener('change', function () {
                requestAnimationFrame(function () {
                  if (!input.__validationStarted) {
                    const checkedCount = radioCheckGroup.querySelectorAll(
                      'input:checked').length;
                    const min = parseInt(radioCheckGroup.getAttribute('min')) || 1;

                    if (checkedCount >= min) {
                      input.__validationStarted = true;
                    }
                  }

                  if (input.__validationStarted) {
                    updateFieldStatus(fieldGroup);
                  }
                });
              });

              input.addEventListener('blur', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            });
          } else if (input) {
            input.__validationStarted = false;

            if (input.tagName.toLowerCase() === 'select') {
              input.addEventListener('change', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            } else {
              input.addEventListener('input', function () {
                const value = input.value.trim();
                const length = value.length;
                const min = parseInt(input.getAttribute('min')) || 0;
                const max = parseInt(input.getAttribute('max')) || Infinity;

                if (!input.__validationStarted) {
                  if (input.type === 'email') {
                    if (isValid(fieldGroup)) input.__validationStarted = true;
                  } else {
                    if (
                      (input.hasAttribute('min') && length >= min) ||
                      (input.hasAttribute('max') && length <= max)
                    ) {
                      input.__validationStarted = true;
                    }
                  }
                }

                if (input.__validationStarted) {
                  updateFieldStatus(fieldGroup);
                }
              });

              input.addEventListener('blur', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            }
          }
        });

        dataSubmit.addEventListener('click', function () {
          if (validateAndStartLiveValidationForAll()) {
            if (isSpam()) {
              alert('Form submitted too quickly. Please try again.');
              return;
            }
            realSubmitInput.click();
          }
        });

        form.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            if (validateAndStartLiveValidationForAll()) {
              if (isSpam()) {
                alert('Form submitted too quickly. Please try again.');
                return;
              }
              realSubmitInput.click();
            }
          }
        });
      });
    }

    // Initialize Advanced Form Validation
    initAdvancedFormValidation();
  }

  // =========================================================
  // HOME — / (Slater 35211)
  // =========================================================
  function rdHome() {
    // Fade out hero CTA
    gsap.to("#FadeOUT", {
      scrollTrigger: {
        trigger: "#MainWrap", // Use the body as the trigger
        start: "top top", // Start the animation when the top of the body is at the top of the viewport
        end: "2% top",
        scrub: true, // Smoothly scrubs the animation in sync with the scroll
        onEnterBack: () => {
          // Set display to block when scrolling back up
          document.querySelector("#FadeOUT").style.display = "flex";
        }
      },
      opacity: 0, // Fade out to 0 opacity
      filter: "blur(10px)", // Apply a blur effect
      ease: "power2.out", // Use an easing function for a smoother transition
      onComplete: () => {
        // Set display to none once the animation completes
        document.querySelector("#FadeOUT").style.display = "none";
      }
    });

    //home TL animation

    // Initialize the timeline
    const HOME_tl = gsap.timeline();

    // Split text for HeroTitle and HeroText
    const HeroTitle = new SplitText('#HeroTitle', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });
    const HeroText = new SplitText('#HeroText', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });

    // Get split text elements
    const HeroTitleWords = HeroTitle.chars;
    const HeroTextWords = HeroText.lines;

    // Get other elements
    const MotionBtn = document.getElementById("MotionBtn");
    const RedDot = document.getElementById("RED_DOT");
    const marquee1 = document.getElementById("M1");
    const marquee2 = document.getElementById("M2");

    // Add animations to the timeline
    HOME_tl.from(HeroTitleWords, {
        delay: 0.2,
        duration: 1.6,
        ease: 'expo.out',
        yPercent: 200,
        stagger: 0.04,
      })
      .from(HeroTextWords, {
        duration: 0.8,
        ease: 'expo.out',
        opacity: 0,
        yPercent: 40,
        // stagger: 0.1,
      }, "<50%")
      .from(MotionBtn, {
        duration: 0.8,
        ease: 'expo.out',
        opacity: 0,
        yPercent: 20,
      }, "<44%")
      .from(RedDot, {
        duration: 0.8,
        ease: 'expo.out',
        opacity: 0,
        filter: 'blur(10px)',
        yPercent: 20,
      }, "<12%")
      .from([marquee1, marquee2], {
        duration: 1.5,
        ease: 'power2.out',
        y: '40vh',
      }, "<40%");

    // Initialize SplitText
    const MagicTitle = new SplitText('#MagicTitle', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });

    // Get split text elements
    const MagicTitleWords = MagicTitle.chars;

    // Add animations to the timeline with a scroll trigger
    gsap.from(MagicTitleWords, {
      scrollTrigger: {
        trigger: '#TRIGY', // Set the trigger element
        start: 'top 20%', // Start 20% sooner
        end: 'bottom top', // Define an end point if needed
        scrub: true, // Sync animation with scroll position
      },
      duration: 1.6,
      ease: 'expo.out',
      yPercent: 200,
      stagger: 0.04,
    });
  }

  // =========================================================
  // SERVICE — /service and every /locations/… page (Slater 35312)
  // =========================================================
  function rdService() {
    // Initialize the timeline
    const SERVICE_tl = gsap.timeline();

    // Split text for HeroTitle
    const heroTitleSplit = new SplitText('#HeroTitle', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });

    // Split text for Special_text
    const specialTextSplit = new SplitText('#Special_text', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });

    // Get split text elements
    const HeroTitleWords = heroTitleSplit.chars;
    const SPECIAL = specialTextSplit.chars;

    //other items
    const DARK_section = document.getElementById("DARK_section");
    const First_Content = document.getElementById("First_content");
    const local = document.getElementById("text_local");

    // Add animations to the timeline
    SERVICE_tl.from(HeroTitleWords, {
        delay: 0.33,
        duration: 0.8,
        ease: 'expo.out',
        yPercent: 100,
        stagger: 0.03,
      }, "pair")
      .from(DARK_section, {
        duration: 1.4,
        y: '50vh',
        ease: 'power2.out',
      }, "pair")
      .from(First_Content, {
        y: 50,
        opacity: 0,
        transform: 'scale(0.95)',
        filter: "blur(5px)",
        duration: 1,
        ease: 'expo.out',
      })
      .from(SPECIAL, {
        duration: 0.8,
        ease: 'expo.out',
        yPercent: 100,
        stagger: 0.03,
      }, "pair2")
      .from(local, {
        duration: 0.8,
        opacity: 0,
        ease: 'expo.out',
      }, "pair2");

    //TAB SYSTYEM

    function initTabSystem() {
      const wrappers = document.querySelectorAll('[data-tabs="wrapper"]');

      wrappers.forEach((wrapper) => {
        const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]');
        const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]');

        const autoplay = wrapper.dataset.tabsAutoplay === "true";
        const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration) || 5000;

        let activeContent = null; // keep track of active item/link
        let activeVisual = null;
        let isAnimating = false;
        let progressBarTween = null; // to stop/start the progress bar

        function startProgressBar(index) {
          if (progressBarTween) progressBarTween.kill();
          const bar = contentItems[index].querySelector('[data-tabs="item-progress"]');
          if (!bar) return;

          // In this function, you can basically do anything you want, that should happen as a tab is active
          // Maybe you have a circle filling, some other element growing, you name it.
          gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
          progressBarTween = gsap.to(bar, {
            scaleX: 1,
            duration: autoplayDuration / 1000,
            ease: "power1.inOut",
            onComplete: () => {
              if (!isAnimating) {
                const nextIndex = (index + 1) % contentItems.length;
                switchTab(
                  nextIndex
                ); // once bar is full, set next to active – this is important
              }
            },
          });
        }

        function switchTab(index) {
          if (isAnimating || contentItems[index] === activeContent) return;

          isAnimating = true;
          if (progressBarTween) progressBarTween.kill(); // Stop any running progress bar here

          const outgoingContent = activeContent;
          const outgoingVisual = activeVisual;
          const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]');

          const incomingContent = contentItems[index];
          const incomingVisual = visualItems[index];
          const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]');

          outgoingContent?.classList.remove("active");
          outgoingVisual?.classList.remove("active");
          incomingContent.classList.add("active");
          incomingVisual.classList.add("active");

          const tl = gsap.timeline({
            defaults: { duration: 0.65, ease: "power3" },
            onComplete: () => {
              activeContent = incomingContent;
              activeVisual = incomingVisual;
              isAnimating = false;
              if (autoplay) startProgressBar(index); // Start autoplay bar here
            },
          });

          // Wrap 'outgoing' in a check to prevent warnings on first run of the function
          // Of course, during first run (on page load), there's no 'outgoing' tab yet!
          if (outgoingContent) {
            outgoingContent.classList.remove("active");
            outgoingVisual?.classList.remove("active");
            tl.set(outgoingBar, { transformOrigin: "right center" })
              .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
              .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
              .to(outgoingContent.querySelector('[data-tabs="item-details"]'), { height: 0 },
                0);
          }

          incomingContent.classList.add("active");
          incomingVisual.classList.add("active");
          tl.fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, {
                autoAlpha: 1,
                xPercent: 0
              },
              0.3)
            .fromTo(incomingContent.querySelector(
              '[data-tabs="item-details"]'), { height: 0 }, { height: "auto" }, 0)
            .set(incomingBar, { scaleX: 0, transformOrigin: "left center" }, 0);
        }

        // on page load, set first to active
        // idea: you could wrap this in a scrollTrigger
        // so it will only start once a user reaches this section
        switchTab(0);

        // switch tabs on click
        contentItems.forEach((item, i) =>
          item.addEventListener("click", () => {
            if (item === activeContent)
              return; // ignore click if current one is already active
            switchTab(i);
          })
        );

      });
    }

    initTabSystem();
  }

  // =========================================================
  // WORK — /work (Slater 35413)
  // =========================================================
  function rdWork() {
    //hidden older work

    const button = document.getElementById("SEE_OLD_WORK");
    const container = document.getElementById("WORK_CONTAINER");

    // Button fade-in on scroll
    gsap.from(button, {
      duration: 2,
      opacity: 0,
      yPercent: 40,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: button,
        start: 'top 133%',
      }
    });

    // Expand container on click
    button.addEventListener("click", function () {
      const fullHeight = container.scrollHeight;

      gsap.to(container, {
        height: fullHeight,
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => {
          container.style.height = "auto";
        }
      });

      gsap.to(button, {
        opacity: 0,
        duration: 0.5,
        ease: "power1.out",
        onComplete: () => button.style.display = "none"
      });
    });

    //onload

    const WORKS_tl = gsap.timeline();

    const HeroTitle = new SplitText('#HeroTitle', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });

    const HeroTitleWords = HeroTitle.chars;
    const WTL = document.querySelector("#work_title");
    const WorkTXT = document.querySelector("#Work_txt");
    const DARK_section = document.getElementById("DARK_section");
    const First_Content = document.getElementById("First_content");

    WORKS_tl
      .from(HeroTitleWords, {
        delay: 0.33,
        duration: 0.8,
        ease: 'expo.out',
        yPercent: 100,
        stagger: 0.03,
      }, "pair")
      .from(DARK_section, {
        duration: 1.2,
        y: '50vh',
        ease: 'power2.out',
      }, "pair")
      .from(First_Content, {
        duration: 0.6,
        opacity: 0,
        filter: "blur(5px)",
      }, "-=0.6")
      .from(WTL, {
        duration: 0.8,
        opacity: 0,
        ease: 'expo.out',
        yPercent: 120,
      }, "-=0.3")
      .from(WorkTXT, {
        duration: 0.8,
        opacity: 0,
        ease: 'expo.out',
        yPercent: 100,
      }, "-=0.4");

    // ________ batch scrolltrigger ________
    const WORK_GRID = document.querySelector("#WORK_GRID");

    if (WORK_GRID) {
      const Items = Array.from(WORK_GRID.children);

      gsap.set(Items, { // Apply opacity/yPercent to the child elements, not the grid itself
        opacity: 0,
        yPercent: 40
      });

      ScrollTrigger.batch(Items, {
        start: 'top 133%',
        onEnter: (elements) => {
          gsap.to(elements, {
            duration: 2,
            opacity: 1,
            yPercent: 0,
            ease: 'power3.out',
            stagger: 0.2
          });
        }
      });
    }
  }

  // =========================================================
  // PORTFOLIO CONTENT — every /work/… case study (Slater 35499)
  // =========================================================
  function rdWorkItem() {
    const Portfolio_tl = gsap.timeline();

    // Ensure the target element exists before using SplitText
    const heroHeader = document.querySelector('#INTRO');
    const BTN = document.querySelector('.btn-icon-link');
    const BOX = document.querySelector('.project_content');
    const WORK_TEXT = document.querySelector('.intro_data_work');
    const WORK_VIDEO = document.querySelector('.work_video');

    if (heroHeader) {
      // Split text for HeroTitle
      const HeroTitle = new SplitText(heroHeader, {
        type: "lines,chars,words",
        linesClass: "lines-js",
        wordsClass: "word-js",
        charsClass: "char-js"
      });

      // Get split text elements
      const HeroTitleWords = HeroTitle.chars;

      // Add animations to the timeline
      Portfolio_tl.from(HeroTitleWords, {
          delay: 0.33,
          duration: 0.8,
          ease: 'expo.out',
          yPercent: 100,
          stagger: 0.03,
        }, 'pair')
        .from(BOX, {
          duration: 1.6,
          y: '50vh',
          ease: 'power2.out',
        }, 'pair')
        .from(BTN, { // Assuming you want to animate BTN here
          duration: 2,
          x: -24,
          opacity: 0,
          ease: "elastic.out(2, 0.1",
        }, '-=0.6')
        .from([WORK_TEXT, WORK_VIDEO], { // Fading in .Intro_data_WORK & .WORK_VIDEO together
          duration: 1,
          opacity: 0,
          ease: 'power2.out',
        }, '-=1.4');
    }
  }

  // =========================================================
  // BOOKED CALL / NEWSLETTER — /branding-brilliance-newsletter and /call-is-booked (Slater 35515)
  // =========================================================
  function rdNewsletter() {
    const Portfolio_tl = gsap.timeline();

    // Ensure the target element exists before using SplitText
    const heroHeader = document.querySelector('#INTRO');
    const BOX = document.querySelector('.project_content');

    if (heroHeader) {
      // Split text for HeroTitle
      const HeroTitle = new SplitText(heroHeader, {
        type: "lines,chars,words",
        linesClass: "lines-js",
        wordsClass: "word-js",
        charsClass: "char-js"
      });

      // Get split text elements
      const HeroTitleWords = HeroTitle.chars;

      // Add animations to the timeline
      Portfolio_tl.from(HeroTitleWords, {
          delay: 0.33,
          duration: 0.8,
          ease: 'expo.out',
          yPercent: 100,
          stagger: 0.03,
        }, 'pair')
        .from(BOX, {
          duration: 1.6,
          y: '50vh',
          ease: 'power2.out',
        }, 'pair');
    }

    //EMAil
    const emailA = document.querySelector("#Email_A");

    gsap.from(emailA, {
      delay: 0.5,
      opacity: 0,
      filter: "blur(1rem)",
      duration: 1.2,
      y: 50,
      ease: "power2.out"
    });
  }

  // =========================================================
  // RESOURCES — /resources (Slater 37087)
  // =========================================================
  function rdResources() {
    // Initialize the timeline
    const RESO_tl = gsap.timeline();

    // Split text for HeroTitle and HeroText
    const HeroTitle = new SplitText('#HeroTitle', {
      type: "lines,chars,words",
      linesClass: "lines-js",
      wordsClass: "word-js",
      charsClass: "char-js"
    });

    // Get split text elements
    const HeroTitleWords = HeroTitle.chars;

    //other items
    const First_Content = document.getElementById("First_content");
    const Blog_Box = document.getElementById("original");

    // Add animations to the timeline
    RESO_tl.from(HeroTitleWords, {
        duration: 0.6,
        ease: 'expo.out',
        yPercent: 100,
        stagger: 0.03,
      })
      .from(First_Content, {
        opacity: 0, // Start from 0 opacity
        filter: "blur(5px)", // Start with a blur of 5 pixels
        duration: 0.6, // Animate over 0.8 seconds
      }, "<50%")
      .from(Blog_Box, {
        opacity: 0, // Start from 0 opacity
        filter: "blur(5px)", // Start with a blur of 5 pixels
        duration: 1, // Animate over 0.8 seconds
      });
  }

  // =========================================================
  // QUIZ — /rimbo-quiz (Slater 35662)
  // =========================================================
  function rdQuiz() {
    jQuery(function ($) {
      $('#start_btn').on('click', function () {
        $('#OPENING').hide();
        $('#TheQuiz').show();
      });
    });

    jQuery(function ($) {
      var questions = [
      {
        text: "Who is this?",
        choices: ["Swimming doggo", "Pool doggo", "Super doggo", "Gangster doggo"],
        answer: "Pool doggo",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baacf801b7bf3d2952b5_swim%20doggo.avif"
      },
      {
        text: "Do dolphins make rainbows?",
        choices: ["Yes", "For sure !!", "HELL YEAAAHH!!", "no"],
        answer: "no",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baabf7941818f9206d11_raredolphin.avif"
      },
      {
        text: "Whaaat?¿",
        choices: ["beans", "ǝɯ ʞɔᴉlʞƆ", "24", "get money"],
        answer: "ǝɯ ʞɔᴉlʞƆ",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baac1c9bea03eb04d9a4_jake%20qute.gif"
      },
      {
        text: "You will never beat my quiz",
        choices: ["run", "do nothing", "be scared", "fight"],
        answer: "fight",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baace5f540f75bcc8a81_batman.gif"
      },
      {
        text: "69 * 420",
        choices: ["28980", "38760", "24840", "18980"],
        answer: "28980",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baaccf0f44a242318fcc_math.gif"
      },
      {
        text: "This froggo is...",
        choices: ["cute", "beautiful", "poisonous", "all answers are correct"],
        answer: "all answers are correct",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baab8336152373ee545b_froggo.avif"
      },
      {
        text: "Oops, you touched the froggo!",
        choices: ["Whoobie doobie", "Dance with shroom", "Get it together", "Trip it out :3"],
        answer: "Get it together",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9cca79bb46fd660bdc4a9_3333.gif"
      },
      {
        text: "Do you think you're going to win?",
        choices: ["I'm doing fine", "Uhhhh...", "I hope so", ":I"],
        answer: "I'm doing fine",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baacd5cd5274f0549189_fine.gif"
      },
      {
        text: "Boss, how do we make this guy lose?",
        choices: ["lose now", "Click here", "Go final question", "call Rimbo"],
        answer: "Go final question",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baae6f86c2474a3b427a_calling.gif"
      },
      {
        text: "Who is Rimbo?",
        choices: ["Cool dude", "God of vibes", "Funny guy", "My man!"],
        answer: "God of vibes",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9cb9663c31098a3e52ed9_MP4%20to%20GIF%20test.gif"
      }];

      var questionIndex = 0;
      var score = 0;

      function populate() {
        if (questionIndex >= questions.length) {
          showScores(); // End quiz if all questions are answered
          return;
        }

        var currentQuestion = questions[questionIndex];

        $("#QUESTION").text(currentQuestion.text);
        $("#BTN_1 .btn-animate-chars__text").text(currentQuestion.choices[0]);
        $("#BTN_2 .btn-animate-chars__text").text(currentQuestion.choices[1]);
        $("#BTN_3 .btn-animate-chars__text").text(currentQuestion.choices[2]);
        $("#BTN_4 .btn-animate-chars__text").text(currentQuestion.choices[3]);
        $("#Quiz_IMG").attr("src", currentQuestion.img);

        showProgress();
      }

      function showProgress() {
        var currentQuestionNumber = questionIndex + 1;
        $("#progress").text("Question " + currentQuestionNumber + " of " + questions.length);
      }

      function handleAnswerClick() {
        var selectedAnswer = $(this).find(".btn-animate-chars__text").text();
        var correctAnswer = questions[questionIndex].answer;

        if (selectedAnswer === correctAnswer) {
          score++;
        }

        questionIndex++; // Move to next question

        if (questionIndex >= questions.length) {
          showScores(); // Call showScores() to properly display the end screen
        } else {
          populate(); // Load next question
        }
      }

      function showScores() {
        var image_ref = score < 5 ?
          "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baac326fc8390883ba7e_sad.gif" :
          score < 10 ?
          "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baacd16a1ddbaa367246_clap.gif" :
          "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9d1951ac3a50582bc8e90_Tim%20And%20Eric%20Reaction%20GIF.gif";

        // Using GSAP to show the end screen with a fade-in effect
        gsap.set(".ending_screen", { display: "flex" });
        gsap.set(".thequiz", { display: "none" });

        $("#END_IMG").attr("src", image_ref);
        $("#SCORE").text("Your score: " + score + " / " + questions.length);
      }

      // Attach click event listeners to the answer buttons
      $("#BTN_1, #BTN_2, #BTN_3, #BTN_4").on("click", handleAnswerClick);

      // Start the quiz by populating the first question
      populate();
    });
  }

  // =========================================================
  // Run
  // Everything runs straight away, like the old Slater tags did.
  // Each section runs on its own, so an error in one (say, a missing
  // element) doesn't stop the others — same as separate script tags.
  // =========================================================
  function run(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error('[rimbo-designs] ' + name + ':', err);
    }
  }

  // "/nl/work/anapana/" → "/work/anapana" (the Dutch pages run the same code)
  var path = location.pathname.replace(/\/+$/, '').replace(/^\/nl(?=\/|$)/, '') || '/';

  run('global', rdGlobal);
  run('form validation', rdFormValidation);

  if (path === '/') run('home', rdHome);
  else if (path === '/service' || path.indexOf('/locations/') === 0) run('service', rdService);
  else if (path === '/work') run('work', rdWork);
  else if (path.indexOf('/work/') === 0) run('work item', rdWorkItem);
  else if (path === '/branding-brilliance-newsletter' || path === '/call-is-booked') run('newsletter', rdNewsletter);
  else if (path === '/resources') run('resources', rdResources);
  else if (path === '/rimbo-quiz') run('quiz', rdQuiz);

})();
