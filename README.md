# Architecture & Interior Design — Portfolio Landing Page

A clean, responsive single-page portfolio site that showcases an architecture & interior design studio.  
This project demonstrates layout, typography, subtle motion, and small, thoughtful interactions typical of client-facing portfolio pages.

---

![Hero preview](images/bg.jpg)

---

## Overview

This is a focused, static landing page that highlights services, team members, pricing packages, and a contact form. It is lightweight and dependency-light — designed to communicate design intent, responsive composition, and front-end craftsmanship rather than to be a full CMS-powered site.

---

## Features

- Full-screen hero with understated animated background and a clear call-to-action.  
- Slide-out sidebar navigation (hamburger menu) with smooth anchor scrolling.  
- Services / About section laid out with CSS Grid.  
- Interactive team cards using a subtle tilt/hover effect.  
- Pricing cards that present packaged services clearly.  
- Contact form with floating labels (static — no backend wired).  
- Simple preloader, scroll-to-top control, and micro-interactions.

---

## Technologies Used

- HTML5 (semantic markup)  
- CSS3 (Grid, Flexbox, responsive breakpoints, animations)  
- Vanilla JavaScript (menu toggle, smooth scrolling, preloader, scroll-to-top)  
- `tilt.js` for interactive card effects  
- Google Fonts (Baloo Da 2, Josefin Slab, Muli)  
- Font Awesome for icons

---

## Project Structure

├── index.html # Single-page HTML
├── style.css # Styles and responsive rules
├── script.js # UI behavior (menu, smooth scroll, preloader, scroll-to-top)
├── tilt.js # Tilt effect (included locally)
├── images/ # Visual assets used in the site
│ ├── bg.jpg
│ ├── house.png
│ ├── person-1.jpg
│ ├── person-2.jpg
│ ├── person-3.jpg
│ └── contact-bg.jpg
└── README.md # This file


---

## Running Locally

No build step required — this is a static site.

**Open in browser**: Double-click `index.html` or open it in your browser.  
