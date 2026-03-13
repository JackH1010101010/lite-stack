# UK Legal & Compliance Requirements — CUG Hotel Booking Platform

*Researched: March 2026*

---

## 1. ATOL / ABTA

**Risk: LOW (hotel-only)**

Hotel-only bookings do not require ATOL protection — ATOL specifically requires air travel in the package. ABTA membership is voluntary for accommodation-only operators.

**Critical trigger:** Adding flights to the offering immediately requires mandatory ATOL licensing. Any package combining hotel + flight needs ATOL bonding before selling.

Current status: 3 live sites, 38 hotels, hotel-only = no ATOL/ABTA requirement.

---

## 2. GDPR / Cookie Consent (PECR)

**Risk: HIGH — already remediated**

All non-essential cookies (including PostHog analytics) require explicit opt-in consent before being placed. Pre-ticked boxes are invalid. PECR fines are now aligned with UK GDPR — up to £17.5M or 4% of global turnover.

**Current status:** Cookie consent banner is already implemented on all sites with:
- Accept / Decline buttons
- PostHog opt-out by default until accepted
- Privacy policy with cookie categories documented
- Consent stored in localStorage

**Remaining gap:** The consent mechanism uses localStorage (not a cookie), so "clear your cookies" guidance in the privacy policy should mention clearing site data. Minor issue.

---

## 3. CUG Rate Parity

**Risk: LOW**

The Sept 2024 CJEU ruling made OTA price parity clauses unenforceable in the EEA. The UK is outside the EEA, but our model has additional protection: CUGs are an established exception to rate parity clauses. Rates shown only to verified members behind a login gate = non-public distribution channel.

**Action:** Document the business model as a "closed user group distribution channel" in any supplier communications with LiteAPI.

---

## 4. Consumer Rights

### Consumer Rights Act 2015 — MANDATORY

Applies to all bookings. Key obligations:
- All compulsory charges disclosed upfront (no hidden fees)
- Contract terms must be fair and transparent
- Hotel descriptions become part of the contract
- Cancellation fees must reflect genuine losses

### Consumer Contracts Regulations 2013 — EXEMPT

Hotel bookings are specifically exempt from the 14-day cooling-off period. The platform can enforce the hotel's own cancellation policy.

### Package Travel Regulations 2018 — NOT APPLICABLE

Hotel-only bookings don't trigger package travel rules (requires 2+ travel service types). Only becomes relevant if flights, tours, or significant tourism services are bundled.

---

## 5. PCI DSS Compliance

**Risk: LOW — SAQ-A eligible**

Since LiteAPI's Payment SDK handles all card data and the platform never stores, processes, or transmits card numbers, the compliance level is SAQ-A (lowest burden):
- Annual self-assessment (minimal documentation)
- No external audits required
- Must verify LiteAPI maintains PCI DSS certification

**Action needed:** Request LiteAPI's PCI DSS attestation/certificate and document it.

---

## 6. Advertising Standards (ASA)

**Risk: MEDIUM — now mitigated**

The ASA requires substantiation of all pricing and savings claims. "Member exclusive rates" is defensible if the membership mechanism (Google Sign-In) is clearly disclosed.

**Booking.com comparison claims have been removed** (March 2026). The site now shows "Retail" as the reference price (LiteAPI's suggested selling price) and uses "X% off" rather than naming competitors.

**Remaining actions:**
- Keep records of wholesale vs retail rates for substantiation
- Avoid "lowest price" or "best price" absolute claims
- Ensure all terms/conditions affecting rate availability are clearly disclosed

---

## Priority Actions

| # | Action | Priority | Status |
|---|--------|----------|--------|
| 1 | Cookie consent banner | HIGH | Done |
| 2 | Remove Booking.com comparison claims | HIGH | Done |
| 3 | Request LiteAPI PCI DSS certificate | MEDIUM | TODO |
| 4 | Document CUG model for rate parity defence | LOW | TODO |
| 5 | Audit T&Cs for Consumer Rights Act compliance | MEDIUM | TODO |
| 6 | Keep rate substantiation records | LOW | Ongoing |
| 7 | Monitor: never bundle flights without ATOL | CRITICAL | Ongoing |
