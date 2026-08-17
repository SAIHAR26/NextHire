# NextHire 🚀

### AI-Powered Career Intelligence & Placement Readiness Platform for Students

**NextHire** is a full-stack career intelligence platform designed to help students understand their placement readiness, improve their coding profiles, build stronger resumes, discover opportunities, and receive personalized career guidance.

The platform brings **coding profile analysis, resume evaluation, career recommendations, student rankings, progress tracking, opportunity discovery, and an AI-powered career assistant** into a single dashboard.

🌐 **Live Application:** https://next-hire-server-eight.vercel.app/login.html
🔗 **Backend API:** https://nexthire-9nyk.onrender.com
💻 **GitHub:** https://github.com/SAIHAR26/NextHire

---

## ✨ Features

### 🔐 Authentication System

* User signup and login
* Email OTP verification
* Password hashing with bcrypt
* JWT-based authentication
* Session persistence

### 📊 Coding Profile Analyzer

Analyze and combine public coding profiles from:

* LeetCode
* CodeChef
* GitHub
* HackerRank

The platform combines coding activity and achievements from multiple sources to generate a unified student career profile.

### 🧠 Career Intelligence Engine

Provides personalized career insights including:

* Role fit prediction
* Profile strength score
* Hire probability estimation
* Skill gap analysis
* Personalized career roadmap
* Study plans
* Project recommendations

### 📄 Resume Tools

* Resume builder
* Resume preview
* Resume download
* Resume upload
* Resume readiness scoring

### 🏆 Student Rankings

Students can compare profiles using factors such as:

* Coding performance
* Contest participation
* GitHub activity
* Project quality
* Hire probability
* Overall profile strength

### 🌐 Public Profiles

Users can:

* Generate shareable profiles
* Showcase achievements
* Display coding statistics
* Share placement portfolios

### 📅 Weekly Progress Tracker

* Weekly goals
* Task tracking
* Progress monitoring
* Backend synchronization

### 📈 Activity Heatmap

Visualizes:

* Learning consistency
* User activity
* Development history

### 🎯 Contest & Hackathon Discovery

Discover opportunities aggregated from platforms including:

* Codeforces
* CodeChef
* AtCoder
* Kontests
* MLH
* Devpost
* Unstop

### 🤖 NexMind — Career Assistant

**NexMind** is the built-in career assistant that helps students with:

* Career guidance
* Placement preparation
* Skill recommendations
* Resume suggestions
* Project recommendations
* Contest guidance

---

## 🛠 Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Backend

* Node.js
* Express.js
* MongoDB
* JWT
* bcryptjs
* Axios
* Cheerio
* Nodemailer

### Data Processing & Intelligence

* Custom JavaScript scoring models
* CSV-based datasets
* Rule-based recommendation engine
* Profile analysis algorithms

### Deployment

* **Frontend:** Vercel
* **Backend:** Render
* **Database:** MongoDB

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      NextHire       │
                    │   Student Platform  │
                    └──────────┬──────────┘
                               │
                     ┌─────────▼─────────┐
                     │      Frontend     │
                     │ HTML/CSS/JS        │
                     │      Vercel        │
                     └─────────┬─────────┘
                               │
                              API
                               │
                     ┌─────────▼─────────┐
                     │      Backend      │
                     │ Node.js + Express │
                     │      Render       │
                     └─────────┬─────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
       ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
       │   MongoDB   │  │ External APIs│  │ Intelligence│
       │   Database  │  │ & Data Sources│  │   Engine    │
       └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🚀 Deployment

NextHire is currently deployed and accessible online.

### Frontend

**Vercel**

https://next-hire-server-eight.vercel.app/login.html

### Backend

**Render**

https://nexthire-9nyk.onrender.com

### Repository

**GitHub**

https://github.com/SAIHAR26/NextHire

---

## 📌 Project Status

### ✅ Completed

* Authentication system
* Email OTP verification
* Coding profile analysis
* Resume tools
* Student rankings
* Weekly progress tracker
* Activity heatmap
* Contest & hackathon integration
* NexMind career assistant
* Public profile sharing
* Frontend deployment
* Backend deployment
* MongoDB integration

### 🔄 Future Enhancements

* Advanced AI model integration
* Interview preparation suite
* Mock interview system
* Improved placement prediction
* Recruiter-student matching
* Recruiter dashboard enhancements
* Advanced recommendation engine
* Enhanced analytics
* Mobile-first responsive improvements

---

## ⚠️ Development Notes

* OTP verification includes a development fallback mode.
* Some external integrations may use fallback data when third-party services are unavailable.
* Certain APIs depend on the availability and response format of external platforms.
* The platform is actively maintained and may receive feature and UI improvements.

---

## 🎯 Vision

NextHire aims to become a **complete career intelligence platform for students**, helping them:

* Understand their strengths and weaknesses
* Identify skill gaps
* Prepare effectively for placements
* Improve coding and technical skills
* Build stronger resumes
* Discover internships, contests, and hackathons
* Showcase their achievements
* Make better career decisions
* Connect with potential recruiters

---

## 👩‍💻 Built With

**NextHire** was developed as a full-stack student career intelligence platform combining web development, data processing, profile analytics, recommendation systems, and AI-assisted career guidance.

🚀 **Build your profile. Find your gaps. Prepare smarter. Get NextHire-ready.**

