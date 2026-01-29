# Fantasy Slowpitch Application 🥎

## Overview

**Fantasy Slowpitch** is a custom-built fantasy sports web application designed specifically for **recreational slow‑pitch softball leagues**. The goal of the project is to mirror the feel of fantasy baseball while respecting the realities of real-life slow‑pitch schedules, limited weekly games, and imperfect stat tracking.

This project was built as both:

* A **fully usable fantasy system** for a real league
* A **portfolio showcase** demonstrating full‑stack engineering, product design, and iterative problem‑solving

The app handles stat ingestion, scoring, drafting, roster management, and weekly lineups with rules tailored to how slow‑pitch softball actually works.

---

## Core Concept

Traditional fantasy platforms don’t work well for slow‑pitch softball:

* Games happen only **1–2 nights per week**
* Rosters are small
* Stats often come from **CSV exports** (GameChanger)
* Missing a night can mean **zero points**

Fantasy Slowpitch solves this by:

* Locking lineups **by night** instead of by game
* Allowing flexible roster management
* Using a scoring system that rewards **consistency and efficiency**, not volume

---

## League Structure

* **Teams:** 2 (head‑to‑head format)
* **Season-based** (supports multiple seasons)
* **Weekly competition** using cumulative stats
* **Offline draft** with enforced uniqueness

This intentionally small scope keeps the league competitive, personal, and strategic.

---

## Weekly Game Flow

Each real-life week consists of:

* **Monday night games**
* **Friday night games**

### Lineups

* Players are either **Active** or **Bench** for the week
* Bench players still count *if needed* (see substitution rules)
* Lineups lock when the first stat file for that night is uploaded

---

## Weekly Lineups & Bench Rules

Lineups are set **for the full week** (not per-night), because recreational slow-pitch schedules can be fluid and players don’t always have a clearly defined “Monday-only” or “Friday-only” role.

* Each team sets a weekly **Active** roster and **Bench**
* There are **no night-specific swaps**
* Points come from whatever stats are recorded across **both nights** for the players who are Active

### Locking Rule

* Once a player **records stats for a night**, that player becomes **locked**
* Locked players **cannot be swapped or moved** for the remainder of the week
* This applies to all non-captain players

This rule preserves competitive integrity and prevents retroactive optimization after games have been played.

---

## Draft Rules

* Draft is performed **offline** inside the app
* Players can only be drafted **once** across all teams
* Draft state is persisted
* Captains are selected during the draft

The draft system was designed to be fast, deterministic, and resistant to errors.

---

## Captain Rules

Each team has **one Captain**, which is a special roster role designed to reflect how real slow-pitch teams work.

### What the Captain Represents

* The Captain is the **owner of the fantasy team**
* It’s the roster anchor — the player you’re always committed to

### Captain Gameplay Rules

* **Are on both nights** (Monday + Friday)
* **Can never be locked**

### Why This Exists

* Creates a clear “team identity” and prevents constant optimization
* Reflects the real-life dynamic where the team owner/captain is always in the lineup
* Adds strategy elsewhere: drafting depth matters because the Captain slot is fixed

---

## Scoring System

Scoring is designed to reflect **real offensive value** in slow-pitch softball while remaining compatible with imperfect recreational stat tracking. It rewards power, run production, and on-base results — while still penalizing outs.

### Official Scoring Constants

 #### 1b: 1.0   // Single
 #### 2b: 1.5   // Double
 #### 3b: 2.5   // Triple
 #### hr: 3.0   // Home Run
 #### bb: 0.5    // Walk
 #### r: 1.0     // Run Scored
 #### rbi: 0.75  // Run Batted In
 #### roe: 1.0   // Reached on Error (scored as a hit most of the time)
 #### out: -0.5  // Any recorded out

### Key Design Decisions

* **Total Bases are weighted**, not linear — extra-base hits matter more
* **Runs and RBIs are split** to balance lineup context vs individual production
* **Walks matter**, but less than hits
* **Outs are penalized** to discourage empty plate appearances
* **ROE is rewarded** to reflect pressure and hustle

### Efficiency Metric

* **Points Per Plate Appearance (PPPA)** is calculated
* Prevents high-volume but inefficient hitters from dominating

This system intentionally avoids advanced metrics that are unreliable or unavailable in recreational leagues.

---

## Stat Ingestion

* Stats are uploaded via **GameChanger CSV files**
* Files are uploaded separately for Monday and Friday
* Only batting columns are parsed to avoid collisions
* Data is normalized and merged into weekly totals

This approach allows the app to work with imperfect or inconsistent stat exports.

---

## Persistence Model

* Season data stored in SQL Server
* Weekly lineups synced from DB → client
* Draft and roster state persisted
* Read-only access supported for non‑owners

The system is designed to be deterministic: the database is always the source of truth.

---

## Tech Stack

### Frontend

* React
* TypeScript
* Responsive Desktop + Mobile layouts
* Auth-aware UI controls

### Backend

* ASP.NET Core (.NET 8)
* RESTful API
* JWT Authentication
* SQL Server

### Deployment

* Hosted on IIS (Plesk)
* Built assets served from `wwwroot`

---

## Why This Project Exists

Fantasy Slowpitch was built to solve a *real problem* using:

* Product thinking
* Domain-specific rule design
* Full-stack engineering

Rather than cloning ESPN or Yahoo, this project embraces the chaos of recreational sports and builds rules that **feel fair**, **stay fun**, and **don’t punish real life**.

---

## Future Ideas

* Expanded league sizes
* Trade support
* Public read-only mode
* Advanced stat visualizations
* Historical season comparisons

---

## Author

**Matt Martiny**
Kansas City
Full‑stack developer | Sports nerd | Builder

---

If you’re reading this as part of my portfolio: everything here was designed, debated, broken, rebuilt, and stress-tested against real games and real people. That’s the point.
