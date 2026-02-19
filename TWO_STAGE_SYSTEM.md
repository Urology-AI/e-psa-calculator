# Two-Stage ePSA System Documentation

## Overview

The ePSA tool now operates in **two distinct stages**:

1. **ePSA-Pre**: Pre-PSA questionnaire for screening priority (Mobile Bus Triage)
2. **ePSA-Post**: PSA ± MRI integrated risk tool with cancer percentages

---

## Stage 1: ePSA-Pre (Screening Priority)

### Purpose
Pre-PSA triage to determine screening priority. **NO cancer percentages** - only screening categories.

### Inputs

#### Non-Modifiable Factors
- **Age Group**: 40-49, 50-59, 60-69, 70+
- **Family History**: None, 1 relative, 2+ relatives
- **Genetic Mutation**: None/Unknown, Known high-risk mutation
- **Race** (Optional): White/Asian, Hispanic, Black/African American

#### Prior Screening History
- **Prior PSA**: Never, Yes-normal, Yes-elevated, Not sure
- **Prior Biopsy**: No, Yes-negative, Yes-cancer diagnosed
- **Finasteride/Dutasteride**: No, Yes

### Scoring Logic

- **Age**: 40-49=0, 50-59=1, 60-69=2, 70+=3
- **Family History**: None=0, 1 relative=2, 2+=3
- **Genetic Mutation**: None=0, Known=4
- **Race**: White/Asian=0, Hispanic=1, Black=1
- **Prior PSA**: Never=0, Normal=0, Elevated=3, Not sure=1
- **Prior Biopsy**: No=0, Negative=-1, Cancer=Special message

### Output Categories

- **0-2 points** → 🟢 **Routine Screening**
- **3-5 points** → 🟡 **Priority Screening Today**
- **6+ points** → 🔴 **High Priority + Strong Follow-Up Recommended**
- **Prior Cancer** → Special message: "You should follow up with your treating physician."

**Important**: No cancer risk percentages shown in this stage.

---

## Stage 2: ePSA-Post (Risk Assessment)

### Purpose
PSA ± MRI integrated risk tool showing cancer risk percentages.

### When It Appears
Only accessible **after** Stage 1 is completed and PSA level is entered.

### Inputs

- **PSA Level** (required): Numeric value in ng/mL
- **PIRADS Score** (optional): 1, 2, 3, 4, or 5

### Scoring Logic

Starts with **ePSA-Pre total points**, then adds:

**PSA Points**:
- <1 → 0
- 1-2.5 → 5
- 2.6-4 → 10
- 4.1-10 → 20
- >10 → 40

**PIRADS Points**:
- 1-2 → 0
- 3 → 10
- 4 → **OVERRIDE** → Fixed 52% risk
- 5 → **OVERRIDE** → Fixed 89% risk

### Output Categories

- **0-40 points** → 🟢 Low (0-10%)
- **41-80 points** → 🟡 Moderate (10-20%)
- **81-120 points** → 🟠 High (20-40%)
- **>120 points** → 🔴 Very High (40-70%)
- **PIRADS 4** → 🟠 Very High-Risk (52%)
- **PIRADS 5** → 🔴 Very High-Risk (89%)

Includes:
- Risk percentage ranges
- Tailored next-step guidance
- Educational hyperlinks
- Clear "Non-Validated Tool" label

---

## User Flow

1. **User starts** → Stage 1 (ePSA-Pre)
2. **Completes questionnaire** → Sees screening priority
3. **Clicks "Continue to Risk Assessment"** → Stage 2 (ePSA-Post)
4. **Enters PSA** → Can optionally enter PIRADS
5. **Views risk assessment** → Sees cancer risk percentages

---

## Key Features

✅ **Mobile-first** responsive design  
✅ **Mount Sinai colors** (#003A5D blue, #D4AF37 gold)  
✅ **Step-by-step workflow** with progress indicators  
✅ **Tooltips** with research citations  
✅ **Conditional rendering** (PSA/PIRADS show/hide)  
✅ **Clear stage indicators**  
✅ **Educational disclaimers**  

---

## Technical Implementation

- **Frontend**: React 18
- **State Management**: React hooks (useState)
- **Calculators**: Separate modules for Pre and Post
- **Styling**: CSS modules with Mount Sinai branding
- **Deployment**: GitHub Pages via GitHub Actions

---

## Files Structure

```
frontend/src/
├── App.js                    # Main app with two-stage logic
├── components/
│   ├── PreResults.js         # Stage 1 results component
│   ├── PreResults.css
│   ├── Results.js            # Stage 2 results component
│   ├── StepNavigation.js     # Progress indicator
│   └── ...
└── utils/
    ├── epsaPreCalculator.js  # Stage 1 scoring logic
    └── epsaPostCalculator.js # Stage 2 scoring logic
```

---

## Why This Architecture

✅ **Reduces noise** in pre-PSA setting  
✅ **Aligns with mobile bus workflow**  
✅ **Keeps MRI override logic intact**  
✅ **Improves statistical defensibility**  
✅ **Preserves educational framing**  
✅ **Matches validation pipeline structure**  
