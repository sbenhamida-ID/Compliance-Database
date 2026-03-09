---
name: research
description: Research cookies, scripts, iframes, or localStorage items discovered by Osano CMP. Interview-style intake, online research, then optionally add to the database.
user_invocable: true
---

# Research Osano Items

Research and classify items discovered by Osano CMP, then optionally add them to the database.

## Input

The user provides one or more item names and their type (cookie, script, iframe, or localStorage).
If the type is not specified, ask before proceeding.

## Workflow

### Step 1: Parse Input

Identify each item and its type from the user's message.
If multiple items are provided, process them **one at a time** — complete the full workflow for one item before moving to the next.

### Step 2: Interview (One Question at a Time)

Ask these questions **one at a time**. Wait for the user's answer before asking the next.
Stop early if you already have enough context to research effectively.

1. "What page was `{item}` discovered on?"
2. "Is `{item}` part of the page's own content/functionality, or from a third-party service?"
3. "Do you recognize the provider or service behind `{item}`?" (skip if obvious from the name)
4. Ask follow-up questions only if the answers so far are ambiguous or insufficient.

Keep it conversational. Do not dump all questions at once.

### Step 3: Research Online

Use WebSearch and WebFetch to find accurate details from **official sources**:

- Search: item name + type + provider (if known)
- Check cookiedatabase.org for known entries
- Check the provider's official documentation
- Cross-reference at least 2 sources before concluding

Gather: provider, purpose, category, expiry/persistence, regex pattern, source URL.

### Step 4: Present Findings

Share a concise summary with the user:

- **Item**: name
- **Type**: cookie / script / iframe / localStorage
- **Provider**: confirmed provider (or "Unknown" if unconfirmed)
- **Category**: recommended Osano category (Essential, Analytics, Marketing, Personalized, or Blocklisted) — must be GDPR and UK ICO compliant
- **Description**: simple, short, factual — this is what end users see
- **Expiry/Persistence**: if applicable
- **Regex**: suggested pattern
- **Source**: official documentation URL

If provider or purpose cannot be confirmed from official sources, recommend **Blocklisted** with description: `"Blocklisted until provider or purpose confirmed."`

Then ask: **"Do you want me to add this to the database?"**

If the user says no, move to the next item (if any) or end.

### Step 5: Add to Database (if confirmed)

Target files:
- **Cookies** → `data/cookies-db.json`
- **Scripts** or **Iframes** → `data/scripts-db.json` (iframes use the script data model)
- **localStorage** → `data/localstorage-db.json`

Before writing:
1. Read the target JSON file.
2. Check if the item already exists (by name or regex). If it does, inform the user and ask whether to update.
3. Generate the next sequential `id` based on existing entries.
4. Set `addedBy: "seed"`.
5. Append the new entry and write the file.

Then move to the next item (if any) or end.

## Rules

- **One question at a time** — never batch multiple questions in one message.
- **Descriptions must be simple and short** — end users read these. No jargon, no long sentences.
- Follow Description Writing Rules: no examples, no injection notes, no classification instructions. Factual and concise only.
- If provider/purpose is unconfirmed → Blocklisted.
- Iframes are treated as scripts (same data model, same JSON file).
- Never assume. If multiple interpretations exist, ask the user.
- When presenting findings, clearly distinguish confirmed facts from uncertain information.
- **Classifications must be GDPR and UK ICO compliant.** When assigning categories, apply the strictest reasonable interpretation: if an item sets cross-site tracking cookies, shares data with advertisers, or has no privacy-enhanced embed option, classify accordingly (e.g., Marketing, not Personalized). Err on the side of user privacy.
