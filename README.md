This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Lemontree InsightEngine

**Morgan Stanley Code to Give Hackathon**

## Overview

Lemontree InsightEngine is a multi-stakeholder data intelligence platform that transforms raw food access data into actionable insights. It helps organizations move beyond simply locating food resources and instead understand **why people struggle to access them**, where service gaps exist, and how food access can be improved over time.

By combining pantry data, community feedback, and public demographic datasets, InsightEngine enables Lemontree, food providers, donors, and government agencies to make better decisions about food distribution, service quality, and neighborhood-level need.

---

## Problem Statement

Food access organizations collect valuable data from the communities they serve, including pantry locations, service hours, wait times, food availability, user feedback, and photos. However, this information is often difficult to organize, analyze, and share.

This creates several challenges:

- Feedback is unstructured and scattered across text, images, and records
- Pantry performance is hard to evaluate consistently
- Stakeholders cannot easily identify trends, service disruptions, or underserved neighborhoods
- Existing systems often treat food pantries as isolated points rather than part of a broader food access network
- Donors and government agencies lack clear tools to understand impact, demand, and reliability

As a result, shortages may be detected too late, resources may be allocated inefficiently, and food access gaps remain hidden.

---

## Challenge Context

Lemontree helps people navigate local food resources and collects critical information about how well those resources meet community needs. This information has strong potential to guide food banks, governments, and donors toward more effective services, but the current data is not easy to interpret or share with partners.

The challenge was to create a low-maintenance, flexible solution that can process and visualize Lemontree’s data in a way that produces clear, actionable insight.

---

## Our Solution

**Lemontree InsightEngine** transforms messy operational and community data into a unified decision-support platform.

The system:

- Preprocesses and structures pantry and feedback data
- Uses AI to classify unstructured text feedback into useful categories such as wait time, food quality, staffing, accessibility, and service reliability
- Visualizes trends, service gaps, and recurring issues through dashboards and maps
- Layers Lemontree data with public datasets such as census and neighborhood-level indicators
- Supports multiple stakeholder perspectives through role-based views

Our product moves from simple resource mapping to **decision intelligence**, helping partners understand not just where food exists, but where support is most needed and why access is breaking down.

---

## Key Features

### 1. AI-Powered Feedback Intelligence

Users submit reviews and feedback about pantry experiences. InsightEngine uses AI to convert this unstructured data into structured signals such as:

- Sentiment
- Issue category
- Summary tags
- Actionable trends

This allows Lemontree and its partners to analyze community experiences at scale.

### 2. Interactive Food Resource Map

The platform includes an interactive map showing pantry locations and related resource information.

Users can:

- View pantry locations
- Explore service hours and descriptions
- Filter by neighborhood, pantry, resource type, or timeframe
- Layer pantry data with public demographic indicators

### 3. Stakeholder-Specific Dashboards

The same underlying data is translated into different views for different users.

#### Client View

**Question:** Where can I reliably get food right now?

Features:

- Nearby pantry map
- Reliability score
- Wait time estimates
- Food type availability
- Basic review summaries

#### Pantry View

**Question:** How well is my pantry serving the community?

Features:

- Pantry-specific performance dashboard
- Satisfaction and sentiment analysis
- Wait time patterns
- Food availability trends
- Comparison with nearby pantries

#### Impact View

**Question:** Where are the biggest food access gaps?

Features:

- Demand vs. coverage map
- Poverty and SNAP overlays
- Neighborhood comparisons
- Donation impact analysis
- Underserved area detection

#### Lemontree Admin View

**Question:** What patterns exist in the data and what should we do next?

Features:

- System-wide trends
- Common complaints
- Sentiment trends
- Reliability scores
- AI-generated summaries and recommendations

### 4. Data Layering with Public Datasets

InsightEngine combines pantry and feedback data with external sources such as:

- Census demographics
- Poverty rates
- SNAP participation
- Neighborhood health indicators
- Public transit context

This helps expose patterns that would not be visible in pantry data alone.

### 5. Reliability Score

To create a stronger operational metric, InsightEngine introduces a **Reliability Score** for each pantry.

Example formula:

```text
Reliability Score = (Average Feedback × 0.6) + (Consistency of Hours × 0.4)
```
